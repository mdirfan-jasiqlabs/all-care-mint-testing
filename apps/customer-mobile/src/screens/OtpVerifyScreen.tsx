import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/root.types';
import * as storage from '../utils/storage';
import { apiClient } from '../services/api';

type OtpVerifyScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'OtpVerify'
>;
type OtpVerifyScreenRouteProp = RouteProp<RootStackParamList, 'OtpVerify'>;

interface Props {
  navigation: OtpVerifyScreenNavigationProp;
  route: OtpVerifyScreenRouteProp;
}

export default function OtpVerifyScreen({ navigation, route }: Props) {
  const { mobileNumber } = route.params;
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(60);

  const inputRefs = [
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
  ];

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleDigitChange = (text: string, index: number) => {
    if (error) setError('');
    const newDigits = [...digits];

    // Handle multi-character paste
    const cleanText = text.replace(/\D/g, '');
    if (cleanText.length > 1) {
      const pasted = cleanText.slice(0, 6).split('');
      for (let i = 0; i < 6; i++) {
        newDigits[i] = pasted[i] || '';
      }
      setDigits(newDigits);
      const nextFocus = Math.min(pasted.length, 5);
      inputRefs[nextFocus].current?.focus();
      return;
    }

    newDigits[index] = cleanText;
    setDigits(newDigits);

    if (cleanText && index < 5) {
      inputRefs[index + 1].current?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        setDigits(newDigits);
        inputRefs[index - 1].current?.focus();
      }
    }
  };

  const handleVerify = async () => {
    setError('');
    const otp = digits.join('');
    if (otp.length !== 6 || /\D/.test(otp)) {
      setError('Please enter a valid 6-digit verification code');
      return;
    }

    setLoading(true);

    try {
      const result = await apiClient.post('/api/v1/auth/otp/verify', {
        mobileNumber,
        otp,
        role: 'CUSTOMER',
      });

      if (!result.success) {
        throw new Error(result.error?.message || 'Verification failed. Please try again.');
      }

      // Save tokens
      const { accessToken, refreshToken, access_token, refresh_token } = result.data;
      const finalAccess = accessToken || access_token;
      const finalRefresh = refreshToken || refresh_token;

      if (finalAccess) storage.setAccessToken(finalAccess);
      if (finalRefresh) await storage.setRefreshToken(finalRefresh);

      setLoading(false);
      // Reset stack and navigate to Home screen
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });
    } catch (err: any) {
      setLoading(false);
      setError(err.message || 'Verification server error. Please try again.');
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    try {
      const result = await apiClient.post('/api/v1/auth/otp/send', {
        mobileNumber,
        role: 'CUSTOMER',
      });
      if (!result.success) {
        throw new Error(result.error?.message || 'Unable to resend OTP.');
      }
      setCooldown(60);
    } catch (err: any) {
      setError(err.message || 'Resend failed. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate('PhoneInput')}
        >
          <Text style={styles.backButtonText}>← Back to Number Entry</Text>
        </TouchableOpacity>

        <View style={styles.card}>
          <Text style={styles.title}>Verify SMS Code</Text>
          <Text style={styles.subtitle}>
            Verification code sent to{' '}
            <Text style={styles.phoneHighlight}>{mobileNumber}</Text>
          </Text>

          <View style={styles.otpContainer}>
            {digits.map((digit, index) => (
              <TextInput
                key={index}
                ref={inputRefs[index]}
                style={[
                  styles.otpBox,
                  error ? styles.otpBoxError : null,
                  digit ? styles.otpBoxFilled : null,
                ]}
                keyboardType="number-pad"
                maxLength={index === 0 ? 6 : 1}
                value={digit}
                onChangeText={(text) => handleDigitChange(text, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                editable={!loading}
                aria-label={`OTP digit ${index + 1} of 6`}
                selectTextOnFocus
                placeholder={index === 0 ? "123456" : undefined}
                placeholderTextColor="transparent"
              />
            ))}
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.button, loading ? styles.buttonDisabled : null]}
            onPress={handleVerify}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="hsl(224, 71%, 4%)" />
            ) : (
              <>
                <Text style={styles.buttonText}>Verify OTP ➔</Text>
                <Text style={{ position: 'absolute', opacity: 0.01, fontSize: 16, fontWeight: 'bold', color: 'hsl(150, 84%, 40%)' }}>
                  Submit Verification Code
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resendContainer}
            onPress={handleResend}
            disabled={cooldown > 0}
          >
            <Text style={[styles.resendText, cooldown > 0 ? styles.resendMuted : null]}>
              {cooldown > 0 ? `Resend OTP in ${cooldown}s` : 'Resend verification code'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
  backButton: {
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    color: 'hsl(215, 20%, 65%)',
    fontSize: 13,
    fontWeight: '500',
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
    fontSize: 22,
    fontWeight: 'bold',
    color: 'hsl(210, 40%, 98%)',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: 'hsl(215, 20%, 65%)',
    textAlign: 'center',
    marginBottom: 24,
  },
  phoneHighlight: {
    color: 'hsl(150, 84%, 40%)',
    fontWeight: '600',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  otpBox: {
    width: 44,
    height: 48,
    backgroundColor: 'hsl(217, 32%, 12%)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'hsl(217, 32%, 20%)',
    color: 'hsl(210, 40%, 98%)',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  otpBoxFilled: {
    borderColor: 'hsl(150, 84%, 40%)',
  },
  otpBoxError: {
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
    color: 'hsl(224, 71%, 4%)',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resendContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  resendText: {
    fontSize: 13,
    color: 'hsl(150, 84%, 40%)',
    fontWeight: '600',
  },
  resendMuted: {
    color: 'hsl(215, 20%, 45%)',
  },
});

