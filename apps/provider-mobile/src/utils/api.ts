import { Platform } from 'react-native';

export const getBaseUrl = (): string => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) {
    return envUrl;
  }
  if (Platform.OS === 'web') {
    const hostname = typeof window !== 'undefined' && window.location ? window.location.hostname : 'localhost';
    return `http://${hostname}:3000`;
  }
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3000';
  }
  return 'http://localhost:3000';
};
