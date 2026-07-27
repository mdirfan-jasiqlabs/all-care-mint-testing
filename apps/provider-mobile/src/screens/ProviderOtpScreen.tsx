import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Platform,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/root.types';
import * as storage from '../utils/storage';

type ProviderOtpScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'ProviderOtp'
>;
type ProviderOtpScreenRouteProp = RouteProp<RootStackParamList, 'ProviderOtp'>;

interface Props {
  navigation: ProviderOtpScreenNavigationProp;
  route: ProviderOtpScreenRouteProp;
}

export default function ProviderOtpScreen({ navigation, route }: Props) {
  const { mobileNumber } = route.params;
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(30);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleVerify = async () => {
    setError('');
    if (otp.length !== 6 || /\D/.test(otp)) {
      setError('Please enter a valid 6-digit verification code');
      return;
    }

    setLoading(true);

    try {
      const baseUrl = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : (Platform.OS === 'web' ? 'http://localhost:3000' : 'http://localhost:3000');
      const firebaseToken = `mock-token-provider-${otp}`;
      
      const response = await fetch(`${baseUrl}/api/v1/auth/provider/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ firebaseToken, role: 'PROVIDER' }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Verification failed. Please try again.');
      }

      // Save tokens
      const { accessToken, refreshToken } = result.data;
      storage.setAccessToken(accessToken);
      await storage.setRefreshToken(refreshToken);

      setLoading(false);
      navigation.replace('ProviderDashboard');
    } catch (err: any) {
      setLoading(false);
      setError(err.message || 'SMS verification server error. Please try again.');
    }
  };

  const handleResend = () => {
    if (cooldown > 0) return;
    setCooldown(30);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Enter Partner Verification Code</Text>
          <Text style={styles.subtitle}>Sent to {mobileNumber}</Text>

          <TextInput
            style={[styles.input, error ? styles.inputError : null]}
            placeholder="123456"
            placeholderTextColor="hsl(215, 20%, 45%)"
            keyboardType="number-pad"
            maxLength={6}
            value={otp}
            onChangeText={(text) => {
              setOtp(text);
              if (error) setError('');
            }}
            editable={!loading}
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.button, loading ? styles.buttonDisabled : null]}
            onPress={handleVerify}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="hsl(210, 40%, 98%)" />
            ) : (
              <Text style={styles.buttonText}>Submit Verification Code</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resendContainer}
            onPress={handleResend}
            disabled={cooldown > 0}
          >
            <Text style={[styles.resendText, cooldown > 0 ? styles.resendMuted : null]}>
              {cooldown > 0 ? `Resend OTP in ${cooldown}s` : 'Resend OTP Code'}
            </Text>
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
    fontSize: 20,
    fontWeight: 'bold',
    color: 'hsl(210, 40%, 98%)',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: 'hsl(215, 20%, 65%)',
    textAlign: 'center',
    marginBottom: 24,
  },
  input: {
    backgroundColor: 'hsl(217, 32%, 12%)',
    height: 50,
    borderRadius: 8,
    paddingHorizontal: 16,
    color: 'hsl(210, 40%, 98%)',
    fontSize: 18,
    textAlign: 'center',
    letterSpacing: 8,
    borderWidth: 1,
    borderColor: 'hsl(217, 32%, 17%)',
    marginBottom: 16,
  },
  inputError: {
    borderColor: 'hsl(350, 84%, 55%)',
  },
  errorText: {
    color: 'hsl(350, 84%, 55%)',
    fontSize: 13,
    marginBottom: 16,
    textAlign: 'center',
  },
  button: {
    backgroundColor: 'hsl(150, 84%, 40%)',
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: 'hsl(210, 40%, 98%)',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resendContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  resendText: {
    fontSize: 14,
    color: 'hsl(150, 84%, 40%)',
    fontWeight: '600',
  },
  resendMuted: {
    color: 'hsl(215, 20%, 45%)',
  },
});
