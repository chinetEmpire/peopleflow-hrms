import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
};

export function middleware(request: NextRequest) {
  const { hostname } = request.nextUrl;
  const url = request.nextUrl.clone();

  // Allow localhost / 127.0.0.1 (development)
  if (hostname === 'localhost' || hostname.startsWith('127.')) {
    return NextResponse.next();
  }

  // Extract subdomain
  const parts = hostname.split('.');
  if (parts.length >= 3) {
    const slug = parts[0];

    // Store slug in a cookie so client components can read it
    const response = NextResponse.next();
    response.cookies.set('org_slug', slug, {
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });

    return response;
  }

  // Root domain (yourapp.com) — no org context, just pass through
  return NextResponse.next();
}
