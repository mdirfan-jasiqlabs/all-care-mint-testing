import { ApiClient } from '@all-care-mint/common';
import { getBaseUrl } from '../utils/api';
import { getAccessToken, clearAccessToken } from '../utils/storage';

export const apiClient = new ApiClient({
  baseUrl: getBaseUrl(),
  getToken: () => getAccessToken(),
  onUnauthorized: () => {
    clearAccessToken();
  },
});

export default apiClient;
