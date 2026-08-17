import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/root.types';
import * as storage from '../utils/storage';
import { apiClient } from '../services/api';
import { useTheme } from '../theme/ThemeContext';

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
  const { colors } = useTheme();
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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate('PhoneInput')}
        >
          <Text style={[styles.backButtonText, { color: colors.textSecondary }]}>← Back to Number Entry</Text>
        </TouchableOpacity>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Verify SMS Code</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Verification code sent to{' '}
            <Text style={[styles.phoneHighlight, { color: colors.primary }]}>{mobileNumber}</Text>
          </Text>

          <View style={styles.otpContainer}>
            {digits.map((digit, index) => (
              <TextInput
                key={index}
                ref={inputRefs[index]}
                style={[
                  styles.otpBox,
                  {
                    backgroundColor: colors.inputBackground,
                    borderColor: error
                      ? colors.danger
                      : digit
                      ? colors.primary
                      : colors.inputBorder,
                    color: colors.inputText,
                  },
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

          {error ? <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text> : null}

          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: colors.primary },
              loading ? styles.buttonDisabled : null,
            ]}
            onPress={handleVerify}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <>
                <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>Verify OTP ➔</Text>
                <Text style={{ position: 'absolute', opacity: 0.01, fontSize: 16, fontWeight: 'bold', color: colors.primary }}>
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
            <Text style={[styles.resendText, { color: cooldown > 0 ? colors.textMuted : colors.primary }]}>
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
    fontSize: 13,
    fontWeight: '500',
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
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 24,
  },
  phoneHighlight: {
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
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 13,
    marginBottom: 16,
    textAlign: 'center',
  },
  button: {
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
    fontSize: 16,
    fontWeight: 'bold',
  },
  resendContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  resendText: {
    fontSize: 13,
    fontWeight: '600',
  },
});


