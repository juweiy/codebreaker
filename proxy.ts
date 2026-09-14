import { auth, isNeonAuthConfigured } from '@/lib/auth/server';
import { type NextRequest, NextResponse } from 'next/server';

const neonAuthMiddleware = auth.middleware({ loginUrl: '/auth/login' });

export default isNeonAuthConfigured
  ? neonAuthMiddleware
  : function proxy(request: NextRequest) {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    };

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/game/:path*',
    '/room/:path*',
    '/protected/:path*',
  ],
};
