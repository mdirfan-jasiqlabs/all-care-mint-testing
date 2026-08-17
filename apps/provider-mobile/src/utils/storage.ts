import * as SecureStore from 'expo-secure-store';

let storageInstance: {
  getString: (key: string) => string | undefined;
  set: (key: string, value: string) => void;
  delete: (key: string) => void;
  clearAll: () => void;
};

try {
  const { MMKV } = require('react-native-mmkv');
  const tempInstance = new MMKV({ id: 'provider-auth-storage' });
  // Verify that MMKV actually works and the JSI bindings are loaded.
  // In Expo Go or testing environments, JSI bindings are missing and
  // calling any method on the instance will throw a TypeError.
  tempInstance.set('__test__', '1');
  tempInstance.delete('__test__');
  storageInstance = tempInstance;
} catch (e) {
  // Web fallback memory storage for responsive manual browser QA testing
  const memStore: Record<string, string> = {};
  storageInstance = {
    getString: (key: string) => memStore[key],
    set: (key: string, value: string) => {
      memStore[key] = value;
    },
    delete: (key: string) => {
      delete memStore[key];
    },
    clearAll: () => {
      for (const k in memStore) {
        delete memStore[k];
      }
    },
  };
}

export const initStorageFallback = async () => {
  try {
    const token = await SecureStore.getItemAsync('auth.accessToken');
    if (token) {
      storageInstance.set('auth.accessToken', token);
    }
  } catch (e) {
    // Ignore
  }
};

export const getAccessToken = (): string | undefined => {
  return storageInstance.getString('auth.accessToken');
};

export const setAccessToken = (token: string) => {
  storageInstance.set('auth.accessToken', token);
  SecureStore.setItemAsync('auth.accessToken', token).catch(() => {});
};

export const clearAccessToken = () => {
  storageInstance.delete('auth.accessToken');
  SecureStore.deleteItemAsync('auth.accessToken').catch(() => {});
};

export const getRefreshToken = async (): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync('auth.refreshToken');
  } catch (e) {
    return storageInstance.getString('auth.refreshToken') || null;
  }
};

export const setRefreshToken = async (token: string) => {
  try {
    await SecureStore.setItemAsync('auth.refreshToken', token);
  } catch (e) {
    storageInstance.set('auth.refreshToken', token);
  }
};

export const clearRefreshToken = async () => {
  try {
    await SecureStore.deleteItemAsync('auth.refreshToken');
  } catch (e) {
    storageInstance.delete('auth.refreshToken');
  }
};

export interface OfflineStatusUpdate {
  bookingId: string;
  status: string;
  timestamp: number;
  retryCount: number;
  clientOpId: string;
}

const OFFLINE_QUEUE_KEY = 'offline_status_updates';

export const getOfflineQueue = (): OfflineStatusUpdate[] => {
  try {
    const data = storageInstance.getString(OFFLINE_QUEUE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};

export const saveOfflineQueue = (queue: OfflineStatusUpdate[]): void => {
  try {
    storageInstance.set(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error('Failed to save offline queue:', e);
  }
};

export const enqueueOfflineUpdate = (bookingId: string, status: string): void => {
  const queue = getOfflineQueue();
  if (!queue.some(item => item.bookingId === bookingId && item.status === status)) {
    const newUpdate: OfflineStatusUpdate = {
      bookingId,
      status,
      timestamp: Date.now(),
      retryCount: 0,
      clientOpId: `op-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
    };
    queue.push(newUpdate);
    saveOfflineQueue(queue);
  }
};

export const removeOfflineUpdate = (clientOpId: string): void => {
  const queue = getOfflineQueue();
  const filteredQueue = queue.filter(item => item.clientOpId !== clientOpId);
  saveOfflineQueue(filteredQueue);
};

const THEME_PREFERENCE_KEY = 'all-care-mint-provider-theme';

export type ProviderThemePreference = 'light' | 'dark' | 'system';

export const getThemePreference = (): ProviderThemePreference => {
  try {
    let val: string | undefined = storageInstance.getString(THEME_PREFERENCE_KEY);
    if (!val && typeof window !== 'undefined' && window.localStorage) {
      val = window.localStorage.getItem(THEME_PREFERENCE_KEY) || undefined;
    }
    if (val === 'light' || val === 'dark' || val === 'system') {
      return val;
    }
  } catch (e) {
    // fallback
  }
  return 'system';
};

export const setThemePreference = (pref: ProviderThemePreference): void => {
  try {
    storageInstance.set(THEME_PREFERENCE_KEY, pref);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(THEME_PREFERENCE_KEY, pref);
    }
  } catch (e) {
    console.error('Failed to save theme preference:', e);
  }
};


