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

export default function GatewayScreen({ navigation }: any) {
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
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>All Care Mint</Text>
          <Text style={styles.subtitle}>Select your app channel gateway to continue</Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.customerButton}
              onPress={handleSelectCustomer}
            >
              <Text style={styles.customerButtonText}>Customer Application ➔</Text>
              <Text style={styles.customerSubtext}>Book & manage local home services</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.providerButton}
              onPress={handleSelectProvider}
            >
              <Text style={styles.providerButtonText}>Provider Partner Portal ➔</Text>
              <Text style={styles.providerSubtext}>Receive assignments & track earnings</Text>
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
    padding: 24,
    borderWidth: 1,
    borderColor: 'hsl(217, 32%, 17%)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'hsl(210, 40%, 98%)',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 12,
    color: 'hsl(215, 20%, 65%)',
    textAlign: 'center',
    marginBottom: 32,
  },
  buttonContainer: {
    gap: 16,
  },
  customerButton: {
    backgroundColor: 'hsl(150, 84%, 40%)',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    shadowColor: 'hsl(150, 84%, 40%)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  customerButtonText: {
    color: 'hsl(224, 71%, 4%)',
    fontSize: 16,
    fontWeight: 'bold',
  },
  customerSubtext: {
    color: 'hsl(224, 71%, 4%)',
    fontSize: 10,
    opacity: 0.9,
    marginTop: 2,
  },
  providerButton: {
    backgroundColor: 'hsl(217, 32%, 12%)',
    borderWidth: 1,
    borderColor: 'hsl(217, 32%, 17%)',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  providerButtonText: {
    color: 'hsl(210, 40%, 98%)',
    fontSize: 16,
    fontWeight: 'bold',
  },
  providerSubtext: {
    color: 'hsl(215, 20%, 65%)',
    fontSize: 10,
    marginTop: 2,
  },
});
