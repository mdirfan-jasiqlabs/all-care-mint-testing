import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import * as crypto from 'crypto';
import { backendApiClient } from '@/lib/api-server';

export async function POST(request: Request) {
  try {
    // 1. Origin/Referer Validation (BFF security check)
    const origin = request.headers.get('origin') || '';
    const host = request.headers.get('host') || '';
    const appUrl = process.env.APP_URL;

    // Allow same-origin requests (where origin matches current host) or configured APP_URL
    const isSameOrigin = host && (origin === `http://${host}` || origin === `https://${host}`);
    const isAppUrlMatch = appUrl ? origin.startsWith(appUrl) : false;

    if (origin && !isSameOrigin && (!appUrl || !isAppUrlMatch)) {
      return NextResponse.json(
        { success: false, error: { code: 'ERR_CSRF', message: 'Forbidden origin' } },
        { status: 403 },
      );
    }

    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: { code: 'ERR_VALIDATION', message: 'Email and password are required' } },
        { status: 400 },
      );
    }

    const response = await backendApiClient.raw('/api/v1/auth/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    const body = await response.json();

    if (!response.ok) {
      return NextResponse.json(body, { status: response.status });
    }

    const { accessToken, refreshToken, user } = body.data;

    // Generate Double-Submit CSRF Token
    const csrfToken = crypto.randomBytes(32).toString('hex');

    // Set secure HTTP-only cookies
    const cookieStore = await cookies();
    
    cookieStore.set('admin_access_token', accessToken, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 14400, // 4 hours
    });

    cookieStore.set('admin_refresh_token', refreshToken, {
      path: '/api/auth/refresh',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 604800, // 7 days
    });

    cookieStore.set('csrf_token', csrfToken, {
      path: '/',
      httpOnly: false, // client-side accessible for double-submit
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 14400, // 4 hours
    });

    return NextResponse.json({
      success: true,
      data: {
        user,
        csrfToken,
        accessToken,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: 'ERR_INTERNAL', message: error.message || 'Internal server error' } },
      { status: 500 },
    );
  }
}
