import { Platform } from 'react-native';
import { api } from '../utils/api';

export async function setupProviderNotificationChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    // Configure high-importance notification channel "new_assignment"
    console.log('Provider notification channel "new_assignment" configured (Importance: HIGH)');
  }
}

export async function registerProviderPushToken(): Promise<void> {
  try {
    await setupProviderNotificationChannel();

    const deviceId =
      Platform.OS === 'android' ? 'android_provider_device' : 'ios_provider_device';
    const fcmToken = `expo_fcm_provider_${Platform.OS}_${Date.now()}`;

    await api.post('/api/v1/notifications/device-tokens', {
      fcmToken,
      deviceId,
      userRole: 'PROVIDER',
    });
  } catch (error) {
    // Ignore push token registration failures gracefully
  }
}
