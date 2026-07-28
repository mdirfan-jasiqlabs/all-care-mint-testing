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

  // 1. Backward Compatibility Redirects
  if (pathname === '/admin/login') {
    const loginUrl = new URL('/login/admin', request.url);
    return NextResponse.redirect(loginUrl);
  }
  if (pathname === '/admin/dashboard') {
    const dashboardUrl = new URL('/dashboard/admin', request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  // 2. Feature Flag Check for Admin Login UI
  const isLoginRoute = pathname === '/login/admin';
  const isFeatureFlagDisabled =
    process.env.FF_ADMIN_LOGIN_UI_ENABLED === 'false' ||
    process.env.ff_admin_login_ui_enabled === 'false';

  if (isLoginRoute && isFeatureFlagDisabled) {
    return new NextResponse(
      'Service Unavailable: Admin console login is temporarily disabled.',
      {
        status: 503,
        headers: { 'Content-Type': 'text/plain' },
      },
    );
  }

  // 3. Routing Interceptor Gating
  const isAdminPage = pathname.startsWith('/admin') || pathname.startsWith('/dashboard');
  const isExcluded = pathname === '/login/admin' || pathname === '/admin/login';

  const accessToken = request.cookies.get('admin_access_token')?.value;
  const isAuthenticated = accessToken && !isTokenExpired(accessToken);

  if (isAdminPage && !isExcluded) {
    if (!isAuthenticated) {
      // Redirect unauthenticated users to the approved login ingress
      const loginUrl = new URL('/login/admin', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 4. Redirect Authenticated Users Away From Login
  if (isExcluded && isAuthenticated) {
    const dashboardUrl = new URL('/dashboard/admin', request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

// Scoped matcher config matching both /admin, /dashboard and /login/admin
export const config = {
  matcher: ['/admin/:path*', '/dashboard/:path*', '/login/admin'],
};
