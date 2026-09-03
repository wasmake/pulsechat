import { getSessionCookie } from 'better-auth/cookies';
import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  if (!getSessionCookie(request, { cookiePrefix: 'pulsechat' })) {
    const signInUrl = new URL('/sign-in', request.url);
    signInUrl.searchParams.set(
      'callbackURL',
      `${request.nextUrl.pathname}${request.nextUrl.search}`
    );
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next|sign-in|sign-up|api/auth|api/health|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
  ],
};
