import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';

export const getBaseUrl = (): string => {
  // 1. Production Build Handling
  const productionUrl = process.env.EXPO_PUBLIC_API_URL;
  const isDev = __DEV__;

  if (!isDev) {
    if (productionUrl) {
      return productionUrl;
    }
    throw new Error('Production API URL (EXPO_PUBLIC_API_URL) is not configured!');
  }

  // 2. Development Build Handling
  // Use configured dev API URL if explicitly set
  if (productionUrl) {
    console.log(`[API] [DEV] Platform: ${Platform.OS}, Mode: Explicit Override, URL: ${productionUrl}`);
    return productionUrl;
  }

  // Web Client environment
  if (Platform.OS === 'web') {
    const hostname = typeof window !== 'undefined' && window.location ? window.location.hostname : 'localhost';
    const devWebUrl = `http://${hostname}:3000`;
    console.log(`[API] [DEV] Platform: web, Mode: Web Development, URL: ${devWebUrl}`);
    return devWebUrl;
  }

  // Safe checks for expo-device availability
  let isPhysical = true;
  try {
    if (Device && typeof Device.isDevice === 'boolean') {
      isPhysical = Device.isDevice;
    } else {
      // Fallback heuristics if Device.isDevice is undefined/unavailable
      const model = (Platform.constants as any)?.Model || '';
      const hardware = (Platform.constants as any)?.Hardware || '';
      const isEmulator = 
        model.toLowerCase().includes('sdk') || 
        model.toLowerCase().includes('emulator') || 
        hardware.includes('goldfish') || 
        hardware.includes('ranchu');
      isPhysical = !isEmulator;
    }
  } catch (e) {
    // If checking throws unexpectedly, default to true or fallback heuristics
  }

  // 3. Android Emulator Check (Takes priority over Metro LAN host)
  if (Platform.OS === 'android' && !isPhysical) {
    const fallbackAndroidUrl = 'http://10.0.2.2:3000';
    console.log(`[API] [DEV] Platform: android, isDevice: false, Mode: Android Emulator, URL: ${fallbackAndroidUrl}`);
    return fallbackAndroidUrl;
  }

  // 4. Physical Devices (Android / iOS)
  if (isPhysical) {
    let hostUri = Constants.expoConfig?.hostUri;

    // Try Expo Go Config debugger host
    if (!hostUri) {
      const debuggerHost = (Constants as any).expoGoConfig?.debuggerHost;
      if (debuggerHost) {
        hostUri = debuggerHost;
      }
    }

    // Guarded legacy/fallback checks
    if (!hostUri) {
      const bundleUrl = (Constants as any).manifest2?.extra?.expoGoLaunchMetadata?.bundleUrl || (Constants as any).manifest?.bundleUrl;
      if (bundleUrl) {
        try {
          const matches = bundleUrl.match(/^https?:\/\/([^:/]+)(:\d+)?/);
          if (matches && matches[1]) {
            hostUri = matches[1];
          }
        } catch (e) {
          // Safe catch for parsing errors
        }
      }
    }

    if (!hostUri && (Constants as any).manifest?.hostUri) {
      hostUri = (Constants as any).manifest.hostUri;
    }

    if (hostUri) {
      const hostIP = hostUri.split(':')[0];
      const resolvedUrl = `http://${hostIP}:3000`;
      console.log(`[API] [DEV] Platform: ${Platform.OS}, isDevice: true, Mode: Metro LAN, URL: ${resolvedUrl}`);
      return resolvedUrl;
    }
  }

  // 5. iOS Simulator Fallback
  if (Platform.OS === 'ios' && !isPhysical) {
    const fallbackIosUrl = 'http://localhost:3000';
    console.log(`[API] [DEV] Platform: ios, isDevice: false, Mode: iOS Simulator, URL: ${fallbackIosUrl}`);
    return fallbackIosUrl;
  }

  // Last-resort fallback for native development
  const finalFallbackUrl = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';
  console.log(`[API] [DEV] Platform: ${Platform.OS}, isDevice: ${isPhysical}, Mode: Last-Resort Fallback, URL: ${finalFallbackUrl}`);
  return finalFallbackUrl;
};
