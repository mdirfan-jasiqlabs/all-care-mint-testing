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
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Sparkles, Briefcase, ShieldCheck, KeyRound, Lock, Zap, Users, ArrowLeft, ArrowRight } from 'lucide-react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/root.types';
import * as storage from '../utils/storage';
import { apiClient } from '../services/api';
import { useProviderTheme } from '../context/ProviderThemeContext';

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
  const { colors } = useProviderTheme();
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
        role: 'PROVIDER',
      });

      if (!result.success || !result.data) {
        throw new Error(result.error?.message || 'Verification failed. Please try again.');
      }

      // Save tokens
      const { accessToken, refreshToken, access_token, refresh_token } = result.data;
      const finalAccess = accessToken || access_token;
      const finalRefresh = refreshToken || refresh_token;

      if (!finalAccess) {
        throw new Error('Access token not returned by server.');
      }

      storage.setAccessToken(finalAccess);
      if (finalRefresh) await storage.setRefreshToken(finalRefresh);

      setLoading(false);
      navigation.replace('ProviderDashboard');
    } catch (err: any) {
      setLoading(false);
      setError(err.message || 'Verification failed. Please check the OTP and try again.');
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    try {
      const result = await apiClient.post('/api/v1/auth/otp/send', {
        mobileNumber,
        role: 'PROVIDER',
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
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Top Brand Header */}
          <View style={styles.topBar}>
            <Image
              source={require('../../assets/logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />

            <View style={[styles.portalBadge, { backgroundColor: 'rgba(16, 185, 129, 0.12)', borderColor: 'rgba(16, 185, 129, 0.25)' }]}>
              <Briefcase size={13} color={colors.primary} style={{ marginRight: 4 }} />
              <Text style={[styles.portalBadgeText, { color: colors.primary }]}>Provider Portal</Text>
            </View>
          </View>

          {/* Centered Body Content */}
          <View style={styles.centerBody}>
            {/* Hero Welcome & Graphic Section */}
            <View style={styles.heroSection}>
              <View style={styles.heroTextCol}>
                <Text style={[styles.welcomeHeading, { color: colors.textPrimary }]}>Verify OTP</Text>
                <Text style={[styles.welcomeSubtitle, { color: colors.textSecondary }]}>
                  Enter the security passcode sent to your device.
                </Text>
              </View>
              <View style={[styles.shieldVisualContainer, { backgroundColor: 'rgba(16, 185, 129, 0.12)', borderColor: 'rgba(16, 185, 129, 0.25)' }]}>
                <View style={styles.shieldGlowInner}>
                  <KeyRound size={34} color={colors.primary} />
                </View>
              </View>
            </View>

            {/* Main Auth Card */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.cardHeaderRow}>
                <View style={[styles.cardIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                  <ShieldCheck size={22} color={colors.primary} />
                </View>
                <View style={styles.cardHeaderTexts}>
                  <Text style={[styles.title, { color: colors.textPrimary }]}>Verify SMS Code</Text>
                  <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                    Code sent to{' '}
                    <Text style={[styles.phoneHighlight, { color: colors.primary }]}>{mobileNumber}</Text>
                  </Text>
                </View>
              </View>

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
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color={colors.primaryForeground} />
                ) : (
                  <>
                    <View style={styles.buttonContent}>
                      <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>Verify OTP</Text>
                      <ArrowRight size={18} color={colors.primaryForeground} style={{ marginLeft: 8 }} />
                    </View>
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
                activeOpacity={0.7}
              >
                <Text style={[styles.resendText, { color: cooldown > 0 ? colors.textMuted : colors.primary }]}>
                  {cooldown > 0 ? `Resend OTP in ${cooldown}s` : 'Resend verification code'}
                </Text>
              </TouchableOpacity>

              <View style={styles.securityIndicatorRow}>
                <Lock size={13} color={colors.textMuted} style={{ marginRight: 5 }} />
                <Text style={[styles.securityIndicatorText, { color: colors.textMuted }]}>
                  Your data is encrypted and secure.
                </Text>
              </View>
            </View>

            {/* Bottom Trust Features */}
            <View style={styles.trustRow}>
              <View style={[styles.trustCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <ShieldCheck size={20} color={colors.primary} style={{ marginBottom: 6 }} />
                <Text style={[styles.trustTitle, { color: colors.textPrimary }]}>Secure</Text>
                <Text style={[styles.trustSub, { color: colors.textMuted }]}>End-to-end encryption</Text>
              </View>

              <View style={[styles.trustCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Zap size={20} color={colors.primary} style={{ marginBottom: 6 }} />
                <Text style={[styles.trustTitle, { color: colors.textPrimary }]}>Reliable</Text>
                <Text style={[styles.trustSub, { color: colors.textMuted }]}>99.9% uptime</Text>
              </View>

              <View style={[styles.trustCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Users size={20} color={colors.primary} style={{ marginBottom: 6 }} />
                <Text style={[styles.trustTitle, { color: colors.textPrimary }]}>Trusted</Text>
                <Text style={[styles.trustSub, { color: colors.textMuted }]}>Active partners</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  centerBody: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 10,
  },
  logoImage: {
    width: 160,
    height: 44,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  portalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
  },
  portalBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  heroSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  heroTextCol: {
    flex: 1,
    marginRight: 12,
  },
  welcomeHeading: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  shieldVisualContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shieldGlowInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 5,
    marginBottom: 20,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  cardIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardHeaderTexts: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  phoneHighlight: {
    fontWeight: '700',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  otpBox: {
    width: 44,
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  errorText: {
    fontSize: 12,
    marginBottom: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  button: {
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  resendContainer: {
    marginTop: 18,
    alignItems: 'center',
  },
  resendText: {
    fontSize: 13,
    fontWeight: '600',
  },
  securityIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  securityIndicatorText: {
    fontSize: 11,
    fontWeight: '500',
  },
  trustRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  trustCard: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 8,
    marginHorizontal: 4,
    borderWidth: 1,
    alignItems: 'center',
  },
  trustTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  trustSub: {
    fontSize: 10,
    textAlign: 'center',
  },
});


