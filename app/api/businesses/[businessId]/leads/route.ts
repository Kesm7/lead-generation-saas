import { NextResponse } from 'next/server';
import { getAuthenticatedUser, hasTrustedRequestOrigin } from '@/lib/auth';
import { backendUnavailable, forbidden, unauthorized, validationError } from '@/lib/api-response';
import { getDb } from '@/lib/db';
import { createLead, listLeads } from '@/lib/lead-service';
import { createLeadSchema, listLeadsQuerySchema, uuidSchema } from '@/lib/lead-validation';
import { getBusinessMembership } from '@/lib/tenant';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ businessId: string }> };

async function authorize(request: Request, businessId: string) {
  const user = await getAuthenticatedUser(request);
  if (!user) return { response: unauthorized() } as const;
  if (!uuidSchema.safeParse(businessId).success) return { response: validationError('Invalid business ID.') } as const;
  const membership = await getBusinessMembership(user.id, businessId);
  if (!membership) return { response: forbidden() } as const;
  return { user } as const;
}

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { businessId } = await params;
    const auth = await authorize(request, businessId);
    if ('response' in auth) return auth.response;

    const url = new URL(request.url);
    const parsed = listLeadsQuerySchema.safeParse({
      ...(url.searchParams.has('status') ? { status: url.searchParams.get('status') } : {}),
      ...(url.searchParams.has('search') ? { search: url.searchParams.get('search') } : {}),
      ...(url.searchParams.has('page') ? { page: url.searchParams.get('page') } : {}),
      ...(url.searchParams.has('perPage') ? { perPage: url.searchParams.get('perPage') } : {}),
    });
    if (!parsed.success) return validationError(parsed.error.issues[0]?.message ?? 'Invalid query parameters.');

    const result = await listLeads(getDb(), businessId, parsed.data);
    return NextResponse.json(result);
  } catch {
    return backendUnavailable();
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    if (!hasTrustedRequestOrigin(request)) return validationError('Request origin is not allowed.');
    const { businessId } = await params;
    const auth = await authorize(request, businessId);
    if ('response' in auth) return auth.response;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return validationError('Request body must be valid JSON.');
    }
    const parsed = createLeadSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error.issues[0]?.message ?? 'Invalid lead data.');

    const item = await createLead(getDb(), businessId, auth.user.id, parsed.data);
    return NextResponse.json({ item }, { status: 201 });
  } catch {
    return backendUnavailable();
  }
}
