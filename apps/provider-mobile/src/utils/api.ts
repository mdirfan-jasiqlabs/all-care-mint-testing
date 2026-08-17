import { Platform } from 'react-native';

let Constants: any = null;
try {
  Constants = require('expo-constants').default || require('expo-constants');
} catch (e) {}

export const getBaseUrl = (): string => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) {
    return envUrl;
  }
  if (Platform.OS === 'web') {
    const hostname = typeof window !== 'undefined' && window.location ? window.location.hostname : 'localhost';
    return `http://${hostname}:3000`;
  }

  // Check Metro hostUri for physical devices
  const hostUri = Constants.expoConfig?.hostUri || (Constants as any).expoGoConfig?.debuggerHost || (Constants as any).manifest?.hostUri;
  if (hostUri) {
    const hostIP = hostUri.split(':')[0];
    if (hostIP && hostIP !== 'localhost' && hostIP !== '127.0.0.1') {
      return `http://${hostIP}:3000`;
    }
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3000';
  }
  return 'http://localhost:3000';
};

