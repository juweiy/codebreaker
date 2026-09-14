import { NextResponse } from 'next/server';
import { DatabaseNotConfiguredError } from '@/lib/db/client';

export function apiError(error: unknown) {
  if (error instanceof DatabaseNotConfiguredError) {
    return NextResponse.json({ error: error.message }, { status: 503 });
  }
  const message = error instanceof Error ? error.message : 'Unexpected error';
  const status =
    message === 'Unauthorized'
      ? 401
      : message.endsWith('not found')
        ? 404
        : 400;
  return NextResponse.json({ error: message }, { status });
}
