import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

let storageInstance: {
  getString: (key: string) => string | undefined;
  set: (key: string, value: string) => void;
  delete: (key: string) => void;
  clearAll: () => void;
};

if (Platform.OS === 'web') {
  const hasLocalStorage = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  const memStore: Record<string, string> = {};
  storageInstance = {
    getString: (key: string) => {
      if (hasLocalStorage) {
        const item = window.localStorage.getItem(key);
        return item === null ? undefined : item;
      }
      return memStore[key];
    },
    set: (key: string, value: string) => {
      if (hasLocalStorage) {
        window.localStorage.setItem(key, value);
      }
      memStore[key] = value;
    },
    delete: (key: string) => {
      if (hasLocalStorage) {
        window.localStorage.removeItem(key);
      }
      delete memStore[key];
    },
    clearAll: () => {
      if (hasLocalStorage) {
        window.localStorage.clear();
      }
      for (const k in memStore) {
        delete memStore[k];
      }
    },
  };
} else {
  try {
    const { MMKV } = require('react-native-mmkv');
    const tempInstance = new MMKV({ id: 'customer-auth-storage' });
    tempInstance.set('__test__', '1');
    tempInstance.delete('__test__');
    storageInstance = tempInstance;
  } catch (e) {
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
}

export const initStorageFallback = async () => {
  try {
    const token = await SecureStore.getItemAsync('auth.accessToken');
    if (token) {
      storageInstance.set('auth.accessToken', token);
    }
    const refreshToken = await SecureStore.getItemAsync('auth.refreshToken');
    if (refreshToken) {
      storageInstance.set('auth.refreshToken', refreshToken);
    }
    const username = await SecureStore.getItemAsync('auth.user_name');
    if (username) {
      storageInstance.set('auth.user_name', username);
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
    const token = await SecureStore.getItemAsync('auth.refreshToken');
    if (token) {
      storageInstance.set('auth.refreshToken', token);
      return token;
    }
    return storageInstance.getString('auth.refreshToken') || null;
  } catch (e) {
    return storageInstance.getString('auth.refreshToken') || null;
  }
};

export const setRefreshToken = async (token: string) => {
  storageInstance.set('auth.refreshToken', token);
  try {
    await SecureStore.setItemAsync('auth.refreshToken', token);
  } catch (e) {
    // Fallback already updated
  }
};

export const clearRefreshToken = async () => {
  storageInstance.delete('auth.refreshToken');
  try {
    await SecureStore.deleteItemAsync('auth.refreshToken');
  } catch (e) {
    // Fallback already updated
  }
};

export const getUserName = (): string | undefined => {
  return storageInstance.getString('auth.user_name');
};

export const setUserName = (name: string) => {
  storageInstance.set('auth.user_name', name);
  SecureStore.setItemAsync('auth.user_name', name).catch(() => {});
};

export const clearUserName = () => {
  storageInstance.delete('auth.user_name');
  SecureStore.deleteItemAsync('auth.user_name').catch(() => {});
};

export const getItem = (key: string): string | undefined => {
  return storageInstance.getString(key);
};

export const setItem = (key: string, value: string) => {
  storageInstance.set(key, value);
};

export const deleteItem = (key: string) => {
  storageInstance.delete(key);
};
