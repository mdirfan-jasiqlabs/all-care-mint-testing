import { Platform, Linking } from 'react-native';
import { api } from '../utils/api';

export interface NotificationResponsePayload {
  notification: {
    request: {
      content: {
        title?: string;
        body?: string;
        data?: {
          booking_id?: string;
          type?: string;
        };
      };
    };
  };
}

export async function registerCustomerPushToken(): Promise<void> {
  try {
    const deviceId =
      Platform.OS === 'android' ? 'android_customer_device' : 'ios_customer_device';
    const fcmToken = `expo_fcm_${Platform.OS}_${Date.now()}`;

    await api.post('/api/v1/notifications/device-tokens', {
      fcm_token: fcmToken,
      device_id: deviceId,
      platform: Platform.OS.toUpperCase(),
    });
  } catch (error) {
    // Ignore push token registration errors silently
  }
}

export function setupNotificationListeners(navigationRef?: any): () => void {
  // Deep link URL handler when notification is tapped: allcaremint://bookings/:booking_id
  const handleDeepLink = (url: string) => {
    if (!url) return;
    const bookingMatch = url.match(/allcaremint:\/\/bookings\/([a-zA-Z0-9-]+)/);
    if (bookingMatch && bookingMatch[1] && navigationRef) {
      navigationRef.navigate('BookingDetail', { bookingId: bookingMatch[1] });
    }
  };

  const subscription = Linking.addEventListener('url', (event) => {
    handleDeepLink(event.url);
  });

  return () => {
    subscription.remove();
  };
}
