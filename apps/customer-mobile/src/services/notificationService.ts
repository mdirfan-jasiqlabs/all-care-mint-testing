import { Platform, Linking } from 'react-native';
import { apiClient } from './api';

let Notifications: any = null;
try {
  Notifications = require('expo-notifications');
} catch (e) {
  // Graceful fallback if expo-notifications module is missing
}

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
    if (Platform.OS === 'android' && Notifications?.setNotificationChannelAsync) {
      try {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance?.HIGH || 4,
          sound: 'default',
          enableVibrate: true,
        });
      } catch (err) {
        // Fallback for Expo Go environment
      }
    }

    const deviceId =
      Platform.OS === 'android' ? 'android_customer_device' : 'ios_customer_device';
    const fcmToken = `expo_fcm_customer_${Platform.OS}_${Date.now()}`;

    await apiClient.post('/api/v1/notifications/device-tokens', {
      fcm_token: fcmToken,
      fcmToken,
      device_id: deviceId,
      deviceId,
      userRole: 'CUSTOMER',
      platform: Platform.OS.toUpperCase(),
    });
  } catch (error) {
    // Ignore push token registration errors silently
  }
}

export function setupNotificationListeners(navigationRef?: any): () => void {
  const subscriptions: Array<() => void> = [];

  // Deep link URL handler when notification is tapped: allcaremint://bookings/:booking_id
  const handleDeepLink = (url: string) => {
    if (!url) return;
    const bookingMatch = url.match(/allcaremint:\/\/bookings\/([a-zA-Z0-9-]+)/);
    if (bookingMatch && bookingMatch[1] && navigationRef) {
      if (navigationRef.isReady && navigationRef.isReady()) {
        navigationRef.navigate('BookingDetail', { bookingId: bookingMatch[1] });
      }
    }
  };

  const subscription = Linking.addEventListener('url', (event) => {
    handleDeepLink(event.url);
  });
  subscriptions.push(() => subscription.remove());

  // Configure Foreground Notification Handler for Expo
  if (Notifications?.setNotificationHandler) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  }

  // Handle Notification Taps inside app
  if (Notifications?.addNotificationResponseReceivedListener) {
    const respSub = Notifications.addNotificationResponseReceivedListener((response: any) => {
      const data = response?.notification?.request?.content?.data || {};
      const bookingId = data.booking_id || data.bookingId;
      if (bookingId && navigationRef) {
        if (navigationRef.isReady && navigationRef.isReady()) {
          navigationRef.navigate('BookingDetail', { bookingId });
        }
      }
    });
    subscriptions.push(() => Notifications.removeNotificationSubscription?.(respSub));
  }

  return () => {
    subscriptions.forEach((unsub) => {
      try {
        unsub();
      } catch (e) {}
    });
  };
}

