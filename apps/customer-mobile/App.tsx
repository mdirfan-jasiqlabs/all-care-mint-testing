import React, { useState, useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { RootStackParamList } from './src/navigation/root.types';
import GatewayScreen from './src/screens/GatewayScreen';
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
import * as storage from './src/utils/storage';

const Stack = createStackNavigator<RootStackParamList>();

export default function App() {
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      // Load fallback credentials from SecureStore if MMKV is in-memory
      await storage.initStorageFallback();
      // Check if access token is stored
      const token = storage.getAccessToken();
      if (token) {
        setInitialRoute('Home');
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
    <GestureHandlerRootView style={{ flex: 1 }}>
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
            name="PhoneInput"
            component={PhoneInputScreen}
            options={{ title: 'Sign In' }}
          />
          <Stack.Screen
            name="OtpVerify"
            component={OtpVerifyScreen}
            options={{ title: 'Verify OTP' }}
          />
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{ title: 'Dashboard', headerLeft: () => null }}
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
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
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
