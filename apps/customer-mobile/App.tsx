import React, { useState, useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
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
import NotificationSettingsScreen from './src/screens/NotificationSettingsScreen';
import { setupNotificationListeners } from './src/services/notificationService';
import * as storage from './src/utils/storage';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';

const Stack = createStackNavigator<RootStackParamList>();

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
            options={({ navigation }) => ({
              title: 'Service Details',
              headerLeft: () => (
                <TouchableOpacity
                  onPress={() => navigation.goBack()}
                  style={{ paddingLeft: 16, paddingRight: 8, paddingVertical: 8 }}
                  accessibilityLabel="Back to Catalog"
                  testID="btn-back-to-catalog"
                >
                  <Text style={{ color: colors.primary, fontSize: 16, fontWeight: 'bold' }}>← Back</Text>
                </TouchableOpacity>
              ),
            })}
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

