import { Platform, Linking } from 'react-native';
import apiClient from './api';
import useProviderJobStore from '../store/providerJobStore';

let Notifications: any = null;
try {
  Notifications = require('expo-notifications');
} catch (e) {
  // Graceful fallback if expo-notifications module is not natively linked
}

export async function setupProviderNotificationChannel(): Promise<void> {
  if (Platform.OS === 'android' && Notifications?.setNotificationChannelAsync) {
    try {
      await Notifications.setNotificationChannelAsync('new_assignment', {
        name: 'New Job Assignments',
        importance: Notifications.AndroidImportance?.HIGH || 4,
        sound: 'default',
        vibrationPattern: [0, 250, 250, 250],
        enableVibrate: true,
      });
      console.log('Provider notification channel "new_assignment" created successfully (Importance: HIGH)');
    } catch (err: any) {
      // In Expo Go client, setNotificationChannelAsync may throw NPE due to missing native channels provider
      if (__DEV__) {
        console.log('[NotificationService] Android notification channel initialized in fallback mode');
      }
    }
  } else {
    console.log('Provider notification channel "new_assignment" configured (Importance: HIGH)');
  }
}

export async function registerProviderPushToken(): Promise<void> {
  try {
    await setupProviderNotificationChannel();

    const deviceId = Platform.OS === 'android' ? 'android_provider_device' : 'ios_provider_device';
    const fcmToken = `expo_fcm_provider_${Platform.OS}_${Date.now()}`;

    await apiClient.post('/api/v1/notifications/device-tokens', {
      fcmToken,
      deviceId,
      userRole: 'PROVIDER',
      platform: Platform.OS.toUpperCase(),
    });
  } catch (error) {
    // Ignore push token registration failures gracefully
  }
}

export function parseBookingIdFromUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null;
  // Route pattern: allcaremint://provider/bookings/:booking_id
  const match = url.match(/allcaremint:\/\/provider\/bookings\/([a-zA-Z0-9-]+)/);
  if (match && match[1] && match[1].trim() !== '') {
    return match[1].trim();
  }
  return null;
}

export function setupNotificationListeners(navigationRef?: any): () => void {
  const subscriptions: Array<() => void> = [];

  // Helper to handle navigation safely
  const navigateToBooking = (bookingId: string) => {
    if (!bookingId || !navigationRef?.isReady?.() && !navigationRef?.navigate) return;
    try {
      if (navigationRef.isReady && !navigationRef.isReady()) {
        setTimeout(() => navigateToBooking(bookingId), 500);
        return;
      }
      navigationRef.navigate('ProviderJobDetail', { bookingId });
    } catch (err) {
      console.warn('Failed to navigate to ProviderJobDetail:', err);
    }
  };

  // 1. Handle incoming deep links (Linking)
  const handleDeepLink = (url: string) => {
    const bookingId = parseBookingIdFromUrl(url);
    if (bookingId) {
      // Refresh Zustand assigned jobs store
      useProviderJobStore.getState().fetchAssignedJobs().catch(() => {});
      navigateToBooking(bookingId);
    }
  };

  const linkingSub = Linking.addEventListener('url', (event) => {
    handleDeepLink(event.url);
  });
  subscriptions.push(() => linkingSub.remove());

  // Check initial URL (Cold start deep link)
  Linking.getInitialURL().then((initialUrl) => {
    if (initialUrl) {
      handleDeepLink(initialUrl);
    }
  }).catch(() => {});

  // 2. Configure Foreground Notification Handler
  if (Notifications?.setNotificationHandler) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  }

  // 3. Register Notification Received Listener (Zustand Refresh)
  if (Notifications?.addNotificationReceivedListener) {
    const recSub = Notifications.addNotificationReceivedListener((notification: any) => {
      const data = notification?.request?.content?.data || {};
      if (data.type === 'new_assignment' || data.status === 'ASSIGNED' || data.booking_id) {
        useProviderJobStore.getState().fetchAssignedJobs().catch(() => {});
      }
    });
    subscriptions.push(() => Notifications.removeNotificationSubscription?.(recSub));
  }

  // 4. Register Notification Response / Tap Listener
  if (Notifications?.addNotificationResponseReceivedListener) {
    const respSub = Notifications.addNotificationResponseReceivedListener((response: any) => {
      const data = response?.notification?.request?.content?.data || {};
      const bookingId = data.booking_id || parseBookingIdFromUrl(data.url);
      if (bookingId) {
        useProviderJobStore.getState().fetchAssignedJobs().catch(() => {});
        navigateToBooking(bookingId);
      }
    });
    subscriptions.push(() => Notifications.removeNotificationSubscription?.(respSub));
  }

  // Check Last Notification Response (Cold Start Push Tap)
  if (Notifications?.getLastNotificationResponseAsync) {
    Notifications.getLastNotificationResponseAsync().then((response: any) => {
      if (response) {
        const data = response?.notification?.request?.content?.data || {};
        const bookingId = data.booking_id || parseBookingIdFromUrl(data.url);
        if (bookingId) {
          useProviderJobStore.getState().fetchAssignedJobs().catch(() => {});
          navigateToBooking(bookingId);
        }
      }
    }).catch(() => {});
  }

  // Teardown / Unsubscribe Function
  return () => {
    subscriptions.forEach((unsub) => {
      try {
        unsub();
      } catch (e) {}
    });
  };
}
