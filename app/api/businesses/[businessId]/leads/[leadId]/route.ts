import { NextResponse } from 'next/server';
import { getAuthenticatedUser, hasTrustedRequestOrigin } from '@/lib/auth';
import { backendUnavailable, forbidden, jsonError, unauthorized, validationError } from '@/lib/api-response';
import { getDb } from '@/lib/db';
import { deleteLead, getLead, updateLead } from '@/lib/lead-service';
import { updateLeadSchema, uuidSchema } from '@/lib/lead-validation';
import { getBusinessMembership } from '@/lib/tenant';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ businessId: string; leadId: string }> };

async function authorize(request: Request, businessId: string, leadId: string) {
  const user = await getAuthenticatedUser(request);
  if (!user) return { response: unauthorized() } as const;
  if (!uuidSchema.safeParse(businessId).success || !uuidSchema.safeParse(leadId).success) {
    return { response: validationError('Invalid business or lead ID.') } as const;
  }
  const membership = await getBusinessMembership(user.id, businessId);
  if (!membership) return { response: forbidden() } as const;
  return { user } as const;
}

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { businessId, leadId } = await params;
    const auth = await authorize(request, businessId, leadId);
    if ('response' in auth) return auth.response;
    const item = await getLead(getDb(), businessId, leadId);
    return item ? NextResponse.json({ item }) : jsonError('Lead not found.', 404);
  } catch {
    return backendUnavailable();
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    if (!hasTrustedRequestOrigin(request)) return validationError('Request origin is not allowed.');
    const { businessId, leadId } = await params;
    const auth = await authorize(request, businessId, leadId);
    if ('response' in auth) return auth.response;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return validationError('Request body must be valid JSON.');
    }
    const parsed = updateLeadSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error.issues[0]?.message ?? 'Invalid lead data.');

    const item = await updateLead(getDb(), businessId, leadId, parsed.data);
    return item ? NextResponse.json({ item }) : jsonError('Lead not found.', 404);
  } catch {
    return backendUnavailable();
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    if (!hasTrustedRequestOrigin(request)) return validationError('Request origin is not allowed.');
    const { businessId, leadId } = await params;
    const auth = await authorize(request, businessId, leadId);
    if ('response' in auth) return auth.response;
    const deleted = await deleteLead(getDb(), businessId, leadId);
    return deleted ? new NextResponse(null, { status: 204 }) : jsonError('Lead not found.', 404);
  } catch {
    return backendUnavailable();
  }
}
