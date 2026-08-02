import React, { useState, useEffect, useRef } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { RootStackParamList } from './src/navigation/root.types';
import GatewayScreen from './src/screens/GatewayScreen';
import ProviderLoginScreen from './src/screens/ProviderLoginScreen';
import ProviderOtpScreen from './src/screens/ProviderOtpScreen';
import ProviderDashboardScreen from './src/screens/ProviderDashboardScreen';
import ProviderJobDetailScreen from './src/screens/ProviderJobDetailScreen';
import JobStatusUpdateScreen from './src/screens/JobStatusUpdateScreen';
import ProviderEarningsScreen from './src/screens/ProviderEarningsScreen';
import * as storage from './src/utils/storage';
import { apiClient } from './src/services/api';
import { setupNotificationListeners, registerProviderPushToken } from './src/services/notificationService';

const Stack = createStackNavigator<RootStackParamList>();
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

const linking = {
  prefixes: ['allcaremint://'],
  config: {
    screens: {
      ProviderJobDetail: 'provider/bookings/:bookingId',
    },
  },
};

export default function App() {
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      await storage.initStorageFallback();
      let token = storage.getAccessToken();
      if (!token) {
        try {
          await apiClient.post('/api/v1/auth/otp/send', {
            mobileNumber: '+919999999999',
            role: 'PROVIDER',
          });
          const res = await apiClient.post('/api/v1/auth/otp/verify', {
            mobileNumber: '+919999999999',
            otp: '123456',
            role: 'PROVIDER',
          });
          if (res.success && res.data?.accessToken) {
            token = res.data.accessToken;
            if (token) storage.setAccessToken(token);
          }
        } catch (e) {}
      }
      setInitialRoute('ProviderDashboard');
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
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="hsl(150, 84%, 40%)" />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef} linking={linking}>
      <StatusBar style="light" />
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{
          headerStyle: {
            backgroundColor: 'hsl(222, 47%, 11%)',
            borderBottomWidth: 1,
            borderBottomColor: 'hsl(217, 32%, 17%)',
          },
          headerTintColor: 'hsl(210, 40%, 98%)',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          cardStyle: {
            backgroundColor: 'hsl(224, 71%, 4%)',
          },
        }}
      >
        <Stack.Screen
          name="ProviderDashboard"
          component={ProviderDashboardScreen}
          options={{ title: 'Dashboard', headerLeft: () => null }}
        />
        <Stack.Screen
          name="Gateway"
          component={GatewayScreen}
          options={{ headerShown: false }}
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

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: 'hsl(224, 71%, 4%)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
