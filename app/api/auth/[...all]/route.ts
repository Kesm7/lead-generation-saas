import { toNextJsHandler } from 'better-auth/next-js';
import { getAuth } from '@/lib/auth';

const handlers = toNextJsHandler(async (request) => getAuth().handler(request));
export const GET = handlers.GET;
export const POST = handlers.POST;
export const PATCH = handlers.PATCH;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;
export const runtime = 'nodejs';
