import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContainerProps {
  toastQueue: ToastItem[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toastQueue, onDismiss }) => {
  const [activeToast, setActiveToast] = useState<ToastItem | null>(null);
  const translateY = useRef(new Animated.Value(-40)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  // 1. Process toast queue when no active toast is displayed
  useEffect(() => {
    if (!activeToast && toastQueue.length > 0) {
      const nextToast = toastQueue[0];
      setActiveToast(nextToast);
    }
  }, [activeToast, toastQueue]);

  // 2. Animate entry and auto-dismiss active toast after exactly 3 seconds
  useEffect(() => {
    if (!activeToast) return;

    translateY.setValue(-40);
    opacity.setValue(0);

    // Slide down & Fade in
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-dismiss after 3 seconds (3000ms)
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -40,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onDismiss(activeToast.id);
        setActiveToast(null);
      });
    }, 3000);

    return () => clearTimeout(timer);
  }, [activeToast]);

  if (!activeToast) return null;

  const getVariantStyles = (type: ToastType) => {
    switch (type) {
      case 'success':
        return { bg: '#064e3b', border: '#059669', icon: '✓' };
      case 'warning':
        return { bg: '#78350f', border: '#d97706', icon: '⚠️' };
      case 'info':
        return { bg: '#1e3a8a', border: '#2563eb', icon: 'ℹ️' };
      case 'error':
      default:
        return { bg: '#7f1d1d', border: '#dc2626', icon: '✕' };
    }
  };

  const variant = getVariantStyles(activeToast.type);

  return (
    <View style={styles.overlayContainer} pointerEvents="none">
      <Animated.View
        accessible={true}
        accessibilityLiveRegion="polite"
        style={[
          styles.toastCard,
          {
            backgroundColor: variant.bg,
            borderColor: variant.border,
            transform: [{ translateY }],
            opacity,
          },
        ]}
      >
        <Text style={styles.iconText}>{variant.icon}</Text>
        <Text style={styles.messageText}>{activeToast.message}</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlayContainer: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    maxWidth: '90%',
  },
  iconText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 10,
  },
  messageText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    flexShrink: 1,
  },
});
