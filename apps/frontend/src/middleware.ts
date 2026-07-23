import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    
    // Decode base64 URL payload (Edge-safe atob conversion)
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );

    const payload = JSON.parse(jsonPayload);
    const exp = payload.exp;
    if (!exp) return false;
    return Date.now() >= exp * 1000;
  } catch (err) {
    return true;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Intercept requests to /admin/* pages
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const accessToken = request.cookies.get('admin_access_token')?.value;

    if (!accessToken || isTokenExpired(accessToken)) {
      // Redirect to admin login screen
      const loginUrl = new URL('/admin/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

// Scoped matcher config
export const config = {
  matcher: ['/admin/:path*'],
};
