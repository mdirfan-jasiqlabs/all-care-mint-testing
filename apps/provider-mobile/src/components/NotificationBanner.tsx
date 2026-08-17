import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Animated } from 'react-native';
import { Bell } from 'lucide-react-native';
import { useProviderTheme } from '../context/ProviderThemeContext';

export interface NotificationPayload {
  id: string;
  title: string;
  body: string;
  bookingId?: string;
  timeAgo?: string;
}

let listeners: Array<(payload: NotificationPayload) => void> = [];
let lastPayloadKey = '';
let lastPayloadTime = 0;

export function triggerInAppNotification(payload: Omit<NotificationPayload, 'id'>) {
  const key = `${payload.bookingId || ''}-${payload.body}`;
  const now = Date.now();

  // Deduplicate identical notifications received within 3000ms
  if (key === lastPayloadKey && now - lastPayloadTime < 3000) {
    return;
  }
  lastPayloadKey = key;
  lastPayloadTime = now;

  const fullPayload: NotificationPayload = {
    ...payload,
    id: `${now}-${Math.random()}`,
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
  const { colors } = useProviderTheme();
  const [currentNotification, setCurrentNotification] = useState<NotificationPayload | null>(null);
  const slideAnim = useRef(new Animated.Value(-140)).current;

  useEffect(() => {
    const unsubscribe = subscribeInAppNotifications((payload) => {
      setCurrentNotification(payload);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (currentNotification) {
      slideAnim.setValue(-140);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        friction: 7,
        tension: 40,
      }).start();

      const timer = setTimeout(() => {
        dismissBanner();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [currentNotification]);

  const dismissBanner = () => {
    Animated.timing(slideAnim, {
      toValue: -180,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setCurrentNotification(null);
    });
  };

  if (!currentNotification) return null;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.bannerContainer,
        { transform: [{ translateY: slideAnim }] },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.85}
        style={[styles.bannerContent, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
        onPress={() => {
          const bId = currentNotification.bookingId;
          if (onPressBanner) {
            onPressBanner(bId);
          }
          dismissBanner();
        }}
      >
        <View style={[styles.iconContainer, { backgroundColor: colors.statusAcceptedBg, borderColor: colors.primary }]}>
          <Bell size={16} color={colors.primary} />
        </View>

        <View style={styles.textContainer}>
          <View style={styles.headerRow}>
            <Text style={[styles.appName, { color: colors.textPrimary }]}>{currentNotification.title || 'ALL CARE MINT'}</Text>
            <Text style={[styles.timeAgo, { color: colors.textMuted }]}>{currentNotification.timeAgo || 'now'}</Text>
          </View>
          <Text style={[styles.bodyText, { color: colors.textSecondary }]} numberOfLines={2}>
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
    top: 16,
    left: 16,
    right: 16,
    zIndex: 99999,
    elevation: 100,
  },
  bannerContent: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  iconContainer: {
    width: 34,
    height: 34,
    borderRadius: 10,
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
    letterSpacing: 0.5,
  },
  timeAgo: {
    fontSize: 9,
  },
  bodyText: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
});

