import { ApiClient } from '@all-care-mint/common';
import { getBaseUrl } from '../utils/api';
import {
  getAccessToken,
  setAccessToken,
  clearAccessToken,
  getRefreshToken,
  setRefreshToken,
  clearRefreshToken,
} from '../utils/storage';

let isLoggingOut = false;
let refreshPromise: Promise<boolean | 'unauthenticated' | 'offline'> | null = null;
let onUnauthorizedCallback: (() => void) | null = null;

export const setOnUnauthorizedCallback = (cb: (() => void) | null) => {
  onUnauthorizedCallback = cb;
};

export const setLoggingOutFlag = (val: boolean) => {
  isLoggingOut = val;
};

/**
 * Perform a silent token refresh session for Provider Mobile using the stored refresh token.
 * Rotates both access and refresh tokens when returned by backend.
 */
export const refreshProviderSession = async (): Promise<boolean | 'unauthenticated' | 'offline'> => {
  if (isLoggingOut) {
    return 'unauthenticated';
  }

  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const currentRefresh = await getRefreshToken();
      if (!currentRefresh) {
        return 'unauthenticated';
      }

      const baseUrl = getBaseUrl();
      const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
      const url = `${cleanBase}/api/v1/auth/token/refresh`;

      let response: Response;
      try {
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken: currentRefresh }),
        });
      } catch (networkErr) {
        // Offline / Network error: return 'offline' without destroying stored credentials
        return 'offline';
      }

      if (!response.ok) {
        // Server rejected refresh token (401 / 400 / invalid / revoked / expired)
        return 'unauthenticated';
      }

      const json = await response.json();
      if (!json.success || !json.data) {
        return 'unauthenticated';
      }

      const newAccessToken = json.data.accessToken || json.data.access_token;
      const newRefreshToken = json.data.refreshToken || json.data.refresh_token;

      if (!newAccessToken) {
        return 'unauthenticated';
      }

      // Check if Provider logged out or session was cleared while refresh call was in flight
      const latestRefresh = await getRefreshToken();
      if (!latestRefresh || latestRefresh !== currentRefresh || isLoggingOut) {
        return 'unauthenticated';
      }

      // Atomically persist rotated token pair
      setAccessToken(newAccessToken);
      if (newRefreshToken) {
        await setRefreshToken(newRefreshToken);
      }

      return true;
    } catch (e) {
      return 'unauthenticated';
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

export const handleProviderLogout = async () => {
  setLoggingOutFlag(true);
  const token = getAccessToken();
  const refresh = await getRefreshToken();

  if (token) {
    try {
      const baseUrl = getBaseUrl();
      const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
      await fetch(`${cleanBase}/api/v1/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ refreshToken: refresh }),
      });
    } catch (e) {
      // Ignore network errors during logout
    }
  }

  clearAccessToken();
  await clearRefreshToken();
  setLoggingOutFlag(false);

  if (onUnauthorizedCallback) {
    onUnauthorizedCallback();
  }
};

export const apiClient = new ApiClient({
  baseUrl: getBaseUrl(),
  getToken: () => getAccessToken(),
  refreshToken: () => refreshProviderSession(),
  onUnauthorized: () => {
    clearAccessToken();
    clearRefreshToken();
    if (onUnauthorizedCallback) {
      onUnauthorizedCallback();
    }
  },
});

export default apiClient;
