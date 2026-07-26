import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
};

export function middleware(request: NextRequest) {
  return NextResponse.next();
}
