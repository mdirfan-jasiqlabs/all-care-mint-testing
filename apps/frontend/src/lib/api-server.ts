import { ApiClient } from '@all-care-mint/common';

/**
 * Server-side API client for BFF route handlers.
 * Uses BACKEND_API_URL (server-only env var) to proxy requests to the backend.
 * No token injection — each route handler manages its own auth headers.
 */
export const backendApiClient = new ApiClient({
  baseUrl:
    process.env.BACKEND_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    (process.env.NODE_ENV === 'production'
      ? 'https://all-care-mint-api.onrender.com'
      : 'http://127.0.0.1:3000'),
});

export default backendApiClient;
