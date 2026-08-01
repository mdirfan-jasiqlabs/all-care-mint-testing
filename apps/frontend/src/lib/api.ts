import { ApiClient } from '@all-care-mint/common';

/**
 * Client-side API client for frontend pages.
 * Reads token from sessionStorage/localStorage to match existing patterns.
 */
export const apiClient = new ApiClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  getToken: () => {
    if (typeof window === 'undefined') return null;
    return (
      sessionStorage.getItem('access_token') ||
      localStorage.getItem('admin_token') ||
      localStorage.getItem('access_token') ||
      null
    );
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
