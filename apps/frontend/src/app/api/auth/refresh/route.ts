import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const csrfTokenCookie = cookieStore.get('csrf_token')?.value;
    const csrfHeader = request.headers.get('x-csrf-token');

    // 1. CSRF Verification
    if (!csrfTokenCookie || csrfTokenCookie !== csrfHeader) {
      return NextResponse.json(
        { success: false, error: { code: 'ERR_CSRF', message: 'CSRF token mismatch or missing' } },
        { status: 403 },
      );
    }

    const refreshToken = cookieStore.get('admin_refresh_token')?.value;

    if (!refreshToken) {
      return NextResponse.json(
        { success: false, error: { code: 'ERR_AUTH_INVALID', message: 'No refresh token cookie' } },
        { status: 401 },
      );
    }

    const backendUrl = process.env.BACKEND_API_URL || 'http://127.0.0.1:3000';
    const response = await fetch(`${backendUrl}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    const body = await response.json();

    if (!response.ok) {
      // Clear cookies on invalid refresh session
      cookieStore.delete('admin_access_token');
      cookieStore.delete('admin_refresh_token');
      cookieStore.delete('csrf_token');
      return NextResponse.json(body, { status: response.status });
    }

    const { accessToken: newAccessToken, refreshToken: newRefreshToken } = body.data;

    // Overwrite the secure HttpOnly cookies with new rotated credentials
    cookieStore.set('admin_access_token', newAccessToken, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 14400, // 4 hours
    });

    cookieStore.set('admin_refresh_token', newRefreshToken, {
      path: '/api/auth/refresh',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 604800, // 7 days
    });

    return NextResponse.json({
      success: true,
      data: {
        accessToken: newAccessToken,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: 'ERR_INTERNAL', message: error.message || 'Internal server error' } },
      { status: 500 },
    );
  }
}
