import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('admin_access_token')?.value;
    const refreshToken = cookieStore.get('admin_refresh_token')?.value;

    if (accessToken) {
      const backendUrl = process.env.BACKEND_API_URL || 'http://127.0.0.1:3000';
      try {
        await fetch(`${backendUrl}/api/v1/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ refreshToken }),
        });
      } catch (err) {
        // Silently log or ignore backend connection issues to ensure local logout succeeds
        console.error('BFF logout background call failed:', err);
      }
    }

    // Clear all session cookies
    cookieStore.delete('admin_access_token');
    cookieStore.delete('admin_refresh_token');
    cookieStore.delete('csrf_token');

    return NextResponse.json({
      success: true,
      data: {
        message: 'Logged out successfully',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: 'ERR_INTERNAL', message: error.message || 'Internal server error' } },
      { status: 500 },
    );
  }
}
