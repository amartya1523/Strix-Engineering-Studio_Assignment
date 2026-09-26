import { NextRequest, NextResponse } from 'next/server';
export function proxy(request: NextRequest) {
  if (!request.cookies.get('codeatlas_session')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  return NextResponse.next();
}
export const config = {
  matcher: ['/projects/:path*', '/history/:path*', '/providers/:path*'],
};
