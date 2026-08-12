import { ApiClient } from '@all-care-mint/common';

/**
 * Client-side API client for frontend pages.
 * Reads token from sessionStorage/localStorage to match existing patterns.
 */
export const apiClient = new ApiClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  getToken: () => {
    if (typeof window === 'undefined') return null;
    const token =
      sessionStorage.getItem('access_token') ||
      localStorage.getItem('admin_token') ||
      localStorage.getItem('access_token');
    if (token) return token;
    const match = typeof document !== 'undefined' ? document.cookie.match(/(?:^|; )admin_access_token=([^;]*)/) : null;
    return match && match[1] ? decodeURIComponent(match[1]) : null;
  },
  onUnauthorized: () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('access_token');
      localStorage.removeItem('access_token');
      localStorage.removeItem('admin_token');
      window.location.href = '/admin/login';
    }
  },
});

export default apiClient;
