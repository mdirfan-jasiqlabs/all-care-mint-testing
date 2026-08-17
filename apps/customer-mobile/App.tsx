import React, { useState, useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { RootStackParamList } from './src/navigation/root.types';
import PhoneInputScreen from './src/screens/PhoneInputScreen';
import OtpVerifyScreen from './src/screens/OtpVerifyScreen';
import HomeScreen from './src/screens/HomeScreen';
import CustomerProfileScreen from './src/screens/CustomerProfileScreen';
import { CatalogBrowseScreen } from './src/screens/CatalogBrowseScreen';
import { ServiceDetailScreen } from './src/screens/ServiceDetailScreen';
import AddressSelectionScreen from './src/screens/AddressSelectionScreen';
import SlotSelectionScreen from './src/screens/SlotSelectionScreen';
import BookingSummaryScreen from './src/screens/BookingSummaryScreen';
import BookingConfirmationScreen from './src/screens/BookingConfirmationScreen';
import MyBookingsScreen from './src/screens/MyBookingsScreen';
import BookingDetailScreen from './src/screens/BookingDetailScreen';
import NotificationSettingsScreen from './src/screens/NotificationSettingsScreen';
import { setupNotificationListeners } from './src/services/notificationService';
import { refreshSession, setOnUnauthorizedCallback } from './src/services/api';
import * as storage from './src/utils/storage';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';

const Stack = createStackNavigator<RootStackParamList>();

function decodeBase64(input: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  const str = input.replace(/=+$/, '');
  let output = '';

  for (let i = 0; i < str.length; i += 4) {
    const b1 = chars.indexOf(str.charAt(i));
    const b2 = chars.indexOf(str.charAt(i + 1));
    const b3 = chars.indexOf(str.charAt(i + 2));
    const b4 = chars.indexOf(str.charAt(i + 3));

    const c1 = (b1 << 2) | (b2 >> 4);
    const c2 = ((b2 & 15) << 4) | (b3 >> 2);
    const c3 = ((b3 & 3) << 6) | b4;

    output += String.fromCharCode(c1);
    if (b3 !== -1 && b3 !== 64) output += String.fromCharCode(c2);
    if (b4 !== -1 && b4 !== 64) output += String.fromCharCode(c3);
  }

  return output;
}

function isAccessTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    let decoded = '';
    if (typeof atob === 'function') {
      decoded = atob(base64);
    } else if (typeof (globalThis as any).Buffer !== 'undefined') {
      decoded = (globalThis as any).Buffer.from(base64, 'base64').toString('utf-8');
    } else {
      decoded = decodeBase64(base64);
    }
    const payload = JSON.parse(decoded);
    if (typeof payload.exp !== 'number') return false;
    return Date.now() / 1000 >= payload.exp - 10;
  } catch (e) {
    return true;
  }
}

const linking = {
  prefixes: ['allcaremint://', 'exp://'],
  config: {
    screens: {
      NotificationSettings: 'notifications/settings',
    },
  },
};

function MainAppContent() {
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList | null>(null);
  const navigationRef = useNavigationContainerRef();
  const { colors, resolvedTheme } = useTheme();

  useEffect(() => {
    setOnUnauthorizedCallback(() => {
      if (navigationRef.isReady()) {
        navigationRef.reset({
          index: 0,
          routes: [{ name: 'PhoneInput' }],
        });
      }
    });
    return () => {
      setOnUnauthorizedCallback(null);
    };
  }, [navigationRef]);

  useEffect(() => {
    const checkAuth = async () => {
      // Load fallback credentials from SecureStore if MMKV is in-memory
      await storage.initStorageFallback();
      
      const token = storage.getAccessToken();
      const refreshToken = await storage.getRefreshToken();

      let targetRoute: 'Home' | 'PhoneInput' = 'PhoneInput';

      if (token && !isAccessTokenExpired(token)) {
        targetRoute = 'Home';
      } else if (refreshToken) {
        // Access token missing or expired: attempt silent refresh on startup
        const refreshed = await refreshSession();
        if (refreshed) {
          targetRoute = 'Home';
        } else {
          storage.clearAccessToken();
          await storage.clearRefreshToken();
          storage.clearUserName();
          targetRoute = 'PhoneInput';
        }
      } else {
        storage.clearAccessToken();
        await storage.clearRefreshToken();
        storage.clearUserName();
        targetRoute = 'PhoneInput';
      }

      setInitialRoute(targetRoute);
      console.log('📱 App.tsx checkAuth -> token present:', !!token, 'targetRoute:', targetRoute);
      if (navigationRef.isReady() && targetRoute === 'Home') {
        navigationRef.reset({
          index: 0,
          routes: [{ name: 'Home' }],
        });
      }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    const cleanup = setupNotificationListeners(navigationRef);
    return () => cleanup();
  }, [navigationRef]);

  if (initialRoute === null) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <NavigationContainer ref={navigationRef} linking={linking}>
        <StatusBar style={resolvedTheme === 'light' ? 'dark' : 'light'} />
        <Stack.Navigator
          initialRouteName={initialRoute}
          screenOptions={{
            headerStyle: {
              backgroundColor: colors.headerBackground,
              borderBottomWidth: 1,
              borderBottomColor: colors.headerBorder,
            },
            headerTintColor: colors.headerText,
            headerTitleStyle: {
              fontWeight: 'bold',
            },
            cardStyle: {
              backgroundColor: colors.background,
            },
          }}
        >
          <Stack.Screen
            name="PhoneInput"
            component={PhoneInputScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="OtpVerify"
            component={OtpVerifyScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Profile"
            component={CustomerProfileScreen}
            options={{ title: 'My Profile' }}
          />
          <Stack.Screen
            name="CatalogBrowse"
            component={CatalogBrowseScreen}
            options={{ title: 'Browse Services' }}
          />
          <Stack.Screen
            name="ServiceDetail"
            component={ServiceDetailScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="AddressSelection"
            component={AddressSelectionScreen}
            options={{ title: 'Select Address' }}
          />
          <Stack.Screen
            name="SlotSelection"
            component={SlotSelectionScreen}
            options={{ title: 'Select Time Slot' }}
          />
          <Stack.Screen
            name="BookingSummary"
            component={BookingSummaryScreen}
            options={{ title: 'Booking Summary' }}
          />
          <Stack.Screen
            name="BookingConfirmation"
            component={BookingConfirmationScreen}
            options={{ title: 'Booking Confirmed', headerLeft: () => null }}
          />
          <Stack.Screen
            name="MyBookings"
            component={MyBookingsScreen}
            options={{ title: 'My Bookings' }}
          />
          <Stack.Screen
            name="BookingDetail"
            component={BookingDetailScreen}
            options={{ title: 'Booking Details' }}
          />
          <Stack.Screen
            name="NotificationSettings"
            component={NotificationSettingsScreen}
            options={{ headerShown: false }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <MainAppContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

