import { NextResponse } from 'next/server';

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export function backendUnavailable() {
  return jsonError('The service is temporarily unavailable. Please try again later.', 503);
}

export function unexpectedError() {
  return jsonError('An unexpected error occurred.', 500);
}

export function validationError(message: string) {
  return jsonError(message, 400);
}

export function unauthorized() {
  return jsonError('Authentication required.', 401);
}

export function forbidden() {
  return jsonError('Business access denied.', 404);
}
