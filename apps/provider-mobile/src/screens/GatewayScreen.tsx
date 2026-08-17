import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  Linking,
} from 'react-native';

import * as storage from '../utils/storage';
import { useProviderTheme } from '../context/ProviderThemeContext';
import { ThemeHeaderButton } from '../components/ThemeHeaderButton';

export default function GatewayScreen({ navigation }: any) {
  const { colors } = useProviderTheme();

  const handleSelectCustomer = () => {
    // In dev environment, customer mobile runs on port 8081.
    if (Platform.OS === 'web') {
      window.location.href = 'http://localhost:8081';
    } else {
      Linking.openURL('http://localhost:8081').catch(() => {
        // Fallback for native devices
      });
    }
  };

  const handleSelectProvider = () => {
    const token = storage.getAccessToken();
    if (token) {
      navigation.navigate('ProviderDashboard');
    } else {
      navigation.navigate('ProviderLogin');
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.headerBar}>
        <ThemeHeaderButton />
      </View>
      <View style={styles.container}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>All Care Mint</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Select your app channel gateway to continue</Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.customerButton, { backgroundColor: colors.primary }]}
              onPress={handleSelectCustomer}
            >
              <Text style={[styles.customerButtonText, { color: colors.primaryForeground }]}>Customer Application ➔</Text>
              <Text style={[styles.customerSubtext, { color: colors.primaryForeground }]}>Book & manage local home services</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.providerButton, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
              onPress={handleSelectProvider}
            >
              <Text style={[styles.providerButtonText, { color: colors.textPrimary }]}>Provider Partner Portal ➔</Text>
              <Text style={[styles.providerSubtext, { color: colors.textSecondary }]}>Receive assignments & track earnings</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  headerBar: {
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 32,
  },
  buttonContainer: {
    gap: 16,
  },
  customerButton: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  customerButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  customerSubtext: {
    fontSize: 10,
    opacity: 0.9,
    marginTop: 2,
  },
  providerButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  providerButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  providerSubtext: {
    fontSize: 10,
    marginTop: 2,
  },
});

