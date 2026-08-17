import React, { useState, useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { NavigationContainer, createNavigationContainerRef, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { RootStackParamList } from './src/navigation/root.types';
import ProviderLoginScreen from './src/screens/ProviderLoginScreen';
import ProviderOtpScreen from './src/screens/ProviderOtpScreen';
import ProviderDashboardScreen from './src/screens/ProviderDashboardScreen';
import ProviderJobDetailScreen from './src/screens/ProviderJobDetailScreen';
import JobStatusUpdateScreen from './src/screens/JobStatusUpdateScreen';
import ProviderEarningsScreen from './src/screens/ProviderEarningsScreen';
import * as storage from './src/utils/storage';
import { apiClient } from './src/services/api';
import { setupNotificationListeners, registerProviderPushToken } from './src/services/notificationService';
import { ProviderThemeProvider, useProviderTheme } from './src/context/ProviderThemeContext';
import { ThemeHeaderButton } from './src/components/ThemeHeaderButton';

import { refreshProviderSession, setOnUnauthorizedCallback } from './src/services/api';

const Stack = createStackNavigator<RootStackParamList>();
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

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
    const decoded = decodeBase64(base64);
    const payload = JSON.parse(decoded);
    if (typeof payload.exp !== 'number') return false;
    return Date.now() / 1000 >= payload.exp - 10;
  } catch (e) {
    return true;
  }
}

const linking = {
  prefixes: ['allcaremint://'],
  config: {
    screens: {
      ProviderJobDetail: 'provider/bookings/:bookingId',
    },
  },
};

function MainNavigator() {
  const { resolvedTheme, colors } = useProviderTheme();
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList | null>(null);

  useEffect(() => {
    setOnUnauthorizedCallback(() => {
      if (navigationRef.isReady()) {
        navigationRef.reset({
          index: 0,
          routes: [{ name: 'ProviderLogin' }],
        });
      }
    });
    return () => {
      setOnUnauthorizedCallback(null);
    };
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        await storage.initStorageFallback();
        let token = storage.getAccessToken();
        let refreshToken = await storage.getRefreshToken();

        if (token && !isAccessTokenExpired(token)) {
          setInitialRoute('ProviderDashboard');
        } else if (refreshToken) {
          const refreshResult = await refreshProviderSession();
          if (refreshResult === true || refreshResult === 'offline') {
            setInitialRoute('ProviderDashboard');
          } else {
            storage.clearAccessToken();
            await storage.clearRefreshToken();
            setInitialRoute('ProviderLogin');
          }
        } else {
          // Dev mock login fallback if configured
          try {
            const sendPromise = apiClient.post('/api/v1/auth/otp/send', {
              mobileNumber: '+919999999999',
              role: 'PROVIDER',
            });
            const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 1500));
            await Promise.race([sendPromise, timeoutPromise]);

            const verifyRes: any = await Promise.race([
              apiClient.post('/api/v1/auth/otp/verify', {
                mobileNumber: '+919999999999',
                otp: '123456',
                role: 'PROVIDER',
              }),
              timeoutPromise,
            ]);
            if (verifyRes?.success && verifyRes.data?.accessToken) {
              token = verifyRes.data.accessToken;
              if (token) storage.setAccessToken(token);
              if (verifyRes.data?.refreshToken) {
                await storage.setRefreshToken(verifyRes.data.refreshToken);
              }
              setInitialRoute('ProviderDashboard');
              registerProviderPushToken().catch(() => {});
              return;
            }
          } catch (e) {}
          setInitialRoute('ProviderLogin');
        }
      } catch (err) {
        setInitialRoute('ProviderLogin');
      }
      registerProviderPushToken().catch(() => {});
    };
    checkAuth();
  }, []);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    if (initialRoute !== null) {
      cleanup = setupNotificationListeners(navigationRef);
    }
    return () => {
      if (cleanup) cleanup();
    };
  }, [initialRoute]);

  if (initialRoute === null) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const navigationTheme = {
    dark: resolvedTheme === 'dark',
    colors: {
      ...(resolvedTheme === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
      primary: colors.primary,
      background: colors.background,
      card: colors.headerBackground,
      text: colors.textPrimary,
      border: colors.border,
      notification: colors.primary,
    },
  };

  return (
    <NavigationContainer ref={navigationRef} linking={linking} theme={navigationTheme}>
      <StatusBar style={resolvedTheme === 'dark' ? 'light' : 'dark'} />
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.headerBackground,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            shadowColor: 'transparent',
            elevation: 0,
          },
          headerTintColor: colors.textPrimary,
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          headerRight: () => <ThemeHeaderButton />,
          cardStyle: {
            backgroundColor: colors.background,
          },
        }}
      >
        <Stack.Screen
          name="ProviderDashboard"
          component={ProviderDashboardScreen}
          options={{ title: 'Dashboard', headerLeft: () => null }}
        />
        <Stack.Screen
          name="ProviderLogin"
          component={ProviderLoginScreen}
          options={{ title: 'Partner Sign In' }}
        />
        <Stack.Screen
          name="ProviderOtp"
          component={ProviderOtpScreen}
          options={{ title: 'Verify OTP' }}
        />
        <Stack.Screen
          name="ProviderJobDetail"
          component={ProviderJobDetailScreen}
          options={{ title: 'Job Details' }}
        />
        <Stack.Screen
          name="JobStatusUpdate"
          component={JobStatusUpdateScreen}
          options={{ title: 'Update Progress' }}
        />
        <Stack.Screen
          name="ProviderEarnings"
          component={ProviderEarningsScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ProviderThemeProvider>
      <MainNavigator />
    </ProviderThemeProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

