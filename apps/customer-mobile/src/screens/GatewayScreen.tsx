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
import { useTheme } from '../theme/ThemeContext';

export default function GatewayScreen({ navigation }: any) {
  const { colors } = useTheme();

  const handleSelectCustomer = () => {
    navigation.navigate('PhoneInput');
  };

  const handleSelectProvider = () => {
    // In dev environment, provider mobile runs on port 8082.
    if (Platform.OS === 'web') {
      window.location.href = 'http://localhost:8082';
    } else {
      const targetUrl = Platform.OS === 'android' ? 'http://10.0.2.2:8082' : 'http://localhost:8082';
      Linking.openURL(targetUrl).catch(() => {
        // Fallback for native devices
      });
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.container}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
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
    shadowOpacity: 0.2,
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

