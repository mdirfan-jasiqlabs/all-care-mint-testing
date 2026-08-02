import React, { useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/root.types';
import { registerCustomerPushToken } from '../services/notificationService';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

interface Props {
  navigation: HomeScreenNavigationProp;
}

export default function HomeScreen({ navigation }: Props) {
  useEffect(() => {
    registerCustomerPushToken();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>All Care Mint</Text>
          <Text style={styles.subtitle}>Welcome to your customer dashboard!</Text>

          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate('Profile')}
          >
            <Text style={styles.buttonText}>Go to Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, { marginTop: 12 }]}
            onPress={() => navigation.navigate('CatalogBrowse')}
          >
            <Text style={styles.buttonText}>Browse Services</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, { marginTop: 12 }]}
            onPress={() => navigation.navigate('MyBookings')}
          >
            <Text style={styles.buttonText}>My Bookings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, { marginTop: 12, backgroundColor: 'hsl(217, 32%, 17%)' }]}
            onPress={() => navigation.navigate('NotificationSettings')}
          >
            <Text style={styles.buttonText}>🔔 Notification Settings</Text>
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
    backgroundColor: 'hsl(150, 84%, 40%)',
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
