import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Paths that do not require authentication
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/subscription/verify') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/icons/') ||
    pathname.startsWith('/favicon') ||
    pathname === '/logo.png' ||
    pathname === '/manifest.json' ||
    pathname === '/sw.js' ||
    pathname === '/og-image.png' ||
    pathname === '/apple-touch-icon.png'
  ) {
    return NextResponse.next();
  }

  // Check for admin_session cookie
  const session = request.cookies.get('admin_session')?.value;

  if (!session) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api/subscription/verify|_next/static|_next/image|icons/|favicon|logo\\.png|manifest\\.json|sw\\.js|og-image\\.png|apple-touch-icon\\.png).*)'],
};
