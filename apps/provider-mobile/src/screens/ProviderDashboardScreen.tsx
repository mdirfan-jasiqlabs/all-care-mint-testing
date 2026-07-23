import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, Platform } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/root.types';
import * as storage from '../utils/storage';

type ProviderDashboardScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'ProviderDashboard'
>;

interface Props {
  navigation: ProviderDashboardScreenNavigationProp;
}

export default function ProviderDashboardScreen({ navigation }: Props) {
  const handleLogout = async () => {
    const token = storage.getAccessToken();
    const refresh = await storage.getRefreshToken();

    if (token) {
      try {
        const baseUrl = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : (Platform.OS === 'web' ? 'http://192.168.1.7:3000' : 'http://localhost:3000');
        await fetch(`${baseUrl}/api/v1/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ refreshToken: refresh }),
        });
      } catch (e) {
        // ignore logout errors
      }
    }

    storage.clearAccessToken();
    await storage.clearRefreshToken();
    navigation.replace('ProviderLogin');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Partner Console</Text>
          <Text style={styles.subtitle}>Welcome to your Provider Partner dashboard!</Text>

          <TouchableOpacity style={styles.button} onPress={handleLogout}>
            <Text style={styles.buttonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'hsl(224, 71%, 4%)',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: 'hsl(222, 47%, 11%)',
    borderRadius: 16,
    padding: 32,
    borderWidth: 1,
    borderColor: 'hsl(217, 32%, 17%)',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'hsl(210, 40%, 98%)',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: 'hsl(215, 20%, 65%)',
    textAlign: 'center',
    marginBottom: 32,
  },
  button: {
    backgroundColor: 'hsl(350, 84%, 55%)',
    height: 46,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  buttonText: {
    color: 'hsl(210, 40%, 98%)',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
