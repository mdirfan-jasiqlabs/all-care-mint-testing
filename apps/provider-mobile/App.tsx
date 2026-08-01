import React, { useState, useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
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

const Stack = createStackNavigator<RootStackParamList>();

export default function App() {
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      await storage.initStorageFallback();
      const token = storage.getAccessToken();
      if (token) {
        setInitialRoute('ProviderDashboard');
      } else {
        setInitialRoute('Gateway');
      }
    };
    checkAuth();
  }, []);

  if (initialRoute === null) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="hsl(150, 84%, 40%)" />
      </View>
    );
  }

  return (
    <NavigationContainer>
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
          name="ProviderDashboard"
          component={ProviderDashboardScreen}
          options={{ title: 'Dashboard', headerLeft: () => null }}
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
