import React, { useState, useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { RootStackParamList } from './src/navigation/root.types';
import PhoneInputScreen from './src/screens/PhoneInputScreen';
import OtpVerifyScreen from './src/screens/OtpVerifyScreen';
import HomeScreen from './src/screens/HomeScreen';
import CustomerProfileScreen from './src/screens/CustomerProfileScreen';
import { CatalogBrowseScreen } from './src/screens/CatalogBrowseScreen';
import * as storage from './src/utils/storage';

const Stack = createStackNavigator<RootStackParamList>();

export default function App() {
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      // Check if access token is stored in MMKV
      const token = storage.getAccessToken();
      if (token) {
        setInitialRoute('Home');
      } else {
        setInitialRoute('PhoneInput');
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
