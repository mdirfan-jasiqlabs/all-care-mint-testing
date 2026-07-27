import * as SecureStore from 'expo-secure-store';

let storageInstance: {
  getString: (key: string) => string | undefined;
  set: (key: string, value: string) => void;
  delete: (key: string) => void;
  clearAll: () => void;
};

try {
  const { MMKV } = require('react-native-mmkv');
  const tempInstance = new MMKV({ id: 'customer-auth-storage' });
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

export const getAccessToken = (): string | undefined => {
  return storageInstance.getString('auth.accessToken');
};

export const setAccessToken = (token: string) => {
  storageInstance.set('auth.accessToken', token);
};

export const clearAccessToken = () => {
  storageInstance.delete('auth.accessToken');
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
