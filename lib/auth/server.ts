import { createNeonAuth } from '@neondatabase/auth/next/server';
import { NEON_AUTH_SESSION_COOKIE_NAME } from '@neondatabase/auth/server';
import { cookies } from 'next/headers';
import { cache } from 'react';

const fallbackSecret = 'local-build-only-secret-change-me-123456789';

export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL ?? 'http://127.0.0.1:4444',
  cookies: {
    secret: process.env.NEON_AUTH_COOKIE_SECRET ?? fallbackSecret,
  },
  logLevel: process.env.NEON_AUTH_BASE_URL ? 'warn' : 'silent',
});

export const isNeonAuthConfigured = Boolean(
  process.env.NEON_AUTH_BASE_URL && process.env.NEON_AUTH_COOKIE_SECRET
);

export const getCurrentUser = cache(async () => {
  if (!isNeonAuthConfigured) return null;

  const cookieStore = await cookies();
  if (!cookieStore.has(NEON_AUTH_SESSION_COOKIE_NAME)) return null;

  const { data } = await auth.getSession();
  return data?.user ?? null;
});
