import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Animated } from 'react-native';

export interface NotificationPayload {
  id: string;
  title: string;
  body: string;
  bookingId?: string;
}

let listeners: Array<(payload: NotificationPayload) => void> = [];

export function triggerInAppNotification(payload: Omit<NotificationPayload, 'id'>) {
  const fullPayload: NotificationPayload = {
    ...payload,
    id: `${Date.now()}-${Math.random()}`,
  };
  listeners.forEach((listener) => listener(fullPayload));
}

export function subscribeInAppNotifications(callback: (payload: NotificationPayload) => void) {
  listeners.push(callback);
  return () => {
    listeners = listeners.filter((l) => l !== callback);
  };
}

interface NotificationBannerProps {
  onPressBanner?: (bookingId?: string) => void;
}

export default function NotificationBanner({ onPressBanner }: NotificationBannerProps) {
  const [currentNotification, setCurrentNotification] = useState<NotificationPayload | null>(null);
  const slideAnim = useState(new Animated.Value(-120))[0];

  useEffect(() => {
    const unsubscribe = subscribeInAppNotifications((payload) => {
      setCurrentNotification(payload);
      // Slide down
      Animated.spring(slideAnim, {
        toValue: 10,
        useNativeDriver: true,
        friction: 7,
        tension: 40,
      }).start();

      // Auto dismiss after 5 seconds
      const timer = setTimeout(() => {
        dismissBanner();
      }, 5000);

      return () => clearTimeout(timer);
    });

    return unsubscribe;
  }, []);

  const dismissBanner = () => {
    Animated.timing(slideAnim, {
      toValue: -120,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setCurrentNotification(null);
    });
  };

  if (!currentNotification) return null;

  return (
    <Animated.View
      style={[
        styles.bannerContainer,
        { transform: [{ translateY: slideAnim }] },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.85}
        style={styles.bannerContent}
        onPress={() => {
          const bookingId = currentNotification.bookingId;
          dismissBanner();
          if (onPressBanner) {
            onPressBanner(bookingId);
          }
        }}
      >
        <View style={styles.iconContainer}>
          <Text style={styles.iconText}>🔔</Text>
        </View>

        <View style={styles.textContainer}>
          <View style={styles.headerRow}>
            <Text style={styles.appName}>ALL CARE MINT</Text>
            <Text style={styles.timeAgo}>now</Text>
          </View>
          <Text style={styles.bodyText} numberOfLines={2}>
            {currentNotification.body}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bannerContainer: {
    position: 'absolute',
    top: 40,
    left: 16,
    right: 16,
    zIndex: 99999,
    elevation: 100,
  },
  bannerContent: {
    backgroundColor: 'hsl(222, 47%, 12%)',
    borderColor: 'hsl(217, 32%, 22%)',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  iconContainer: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 16,
  },
  textContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  appName: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'hsl(210, 40%, 98%)',
    letterSpacing: 0.5,
  },
  timeAgo: {
    fontSize: 9,
    color: 'hsl(215, 20%, 55%)',
  },
  bodyText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'hsl(210, 40%, 90%)',
    lineHeight: 16,
  },
});
