import { ApiClient } from '@all-care-mint/common';

const getApiBaseUrl = (): string => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  // Smart fallback: If running in browser on deployed domain (not localhost), use live Render backend
  if (
    typeof window !== 'undefined' &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1'
  ) {
    return 'https://all-care-mint-api.onrender.com';
  }
  return 'http://localhost:3000';
};

/**
 * Client-side API client for frontend pages.
 * Reads token from sessionStorage/localStorage to match existing patterns.
 */
export const apiClient = new ApiClient({
  baseUrl: getApiBaseUrl(),
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
