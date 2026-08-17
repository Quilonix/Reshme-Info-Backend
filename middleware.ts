import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // Allow all Next.js pages to render and let client AuthContext seamlessly manage authenticated session states
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - manifest.json
     * - public assets
     */
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp|txt)$).*)',
  ],
};
