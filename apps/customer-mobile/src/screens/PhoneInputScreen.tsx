import React, { useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/root.types';
import { apiClient } from '../services/api';
import { useTheme } from '../theme/ThemeContext';

type PhoneInputScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'PhoneInput'
>;

interface Props {
  navigation: PhoneInputScreenNavigationProp;
}

export default function PhoneInputScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isOffline, setIsOffline] = useState(false); // Can be connected to NetInfo

  const handleSendCode = async () => {
    setError('');

    // Validation: 10-digit check
    const cleanNum = phoneNumber.replace(/\D/g, '');
    if (cleanNum.length !== 10) {
      setError('Please enter a valid 10-digit number');
      return;
    }

    setLoading(true);

    try {
      const result = await apiClient.post('/api/v1/auth/otp/send', {
        mobileNumber: `${countryCode}${cleanNum}`,
        role: 'CUSTOMER',
      });

      if (!result.success) {
        throw new Error(result.error?.message || 'Unable to send OTP. Please try again.');
      }

      setLoading(false);
      navigation.navigate('OtpVerify', {
        mobileNumber: `${countryCode}${cleanNum}`,
      });
    } catch (err: any) {
      setLoading(false);
      setError(err.message || 'Unable to send OTP. Check internet connection.');
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {isOffline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>
            Internet disconnected. Check connectivity.
          </Text>
        </View>
      )}

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
              <Ionicons name="shield-checkmark" size={13} color={colors.primary} style={{ marginRight: 4 }} />
              <Text style={[styles.portalBadgeText, { color: colors.primary }]}>Customer Portal</Text>
            </View>
          </View>

          {/* Centered Body Content */}
          <View style={styles.centerBody}>
            {/* Hero Welcome & Graphic Section */}
            <View style={styles.heroSection}>
              <View style={styles.heroTextCol}>
                <Text style={[styles.welcomeHeading, { color: colors.textPrimary }]}>Welcome back!</Text>
                <Text style={[styles.welcomeSubtitle, { color: colors.textSecondary }]}>
                  Securely sign in to access your home care services and manage bookings.
                </Text>
              </View>
              <View style={[styles.shieldVisualContainer, { backgroundColor: 'rgba(16, 185, 129, 0.12)', borderColor: 'rgba(16, 185, 129, 0.25)' }]}>
                <View style={styles.shieldGlowInner}>
                  <Ionicons name="shield-checkmark" size={38} color={colors.primary} />
                </View>
              </View>
            </View>

            {/* Main Auth Card */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={styles.cardHeaderRow}>
                <View style={[styles.cardIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                  <Ionicons name="person-outline" size={22} color={colors.primary} />
                </View>
                <View style={styles.cardHeaderTexts}>
                  <Text style={[styles.title, { color: colors.textPrimary }]}>Customer Sign In</Text>
                  <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                    We'll send a 6-digit OTP to your mobile number via secure SMS.
                  </Text>
                </View>
              </View>

              <Text style={[styles.label, { color: colors.textSecondary }]}>Mobile Number (India)</Text>

              <View
                style={[
                  styles.inputContainer,
                  {
                    backgroundColor: colors.inputBackground,
                    borderColor: error ? colors.danger : colors.inputBorder,
                  },
                ]}
              >
                <View style={styles.countryCodeBadge}>
                  <Text style={[styles.countryCodeText, { color: colors.textPrimary }]}>{countryCode}</Text>
                </View>

                <View style={[styles.inputDivider, { backgroundColor: colors.borderSubtle }]} />

                <Ionicons name="call-outline" size={18} color={colors.textMuted} style={styles.phoneIcon} />

                <TextInput
                  style={[styles.input, { color: colors.inputText }]}
                  placeholder="999 999 9999"
                  placeholderTextColor={colors.placeholderText}
                  keyboardType="phone-pad"
                  value={phoneNumber}
                  onChangeText={(text) => {
                    setPhoneNumber(text);
                    if (error) setError('');
                  }}
                  editable={!loading}
                />
              </View>

              {error ? <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text> : null}

              <TouchableOpacity
                style={[
                  styles.button,
                  { backgroundColor: colors.primary },
                  loading ? styles.buttonDisabled : null,
                ]}
                onPress={handleSendCode}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color={colors.primaryForeground} />
                ) : (
                  <View style={styles.buttonContent}>
                    <Ionicons name="paper-plane-outline" size={18} color={colors.primaryForeground} style={{ marginRight: 8 }} />
                    <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>Send Verification Code</Text>
                  </View>
                )}
              </TouchableOpacity>

              <View style={styles.securityIndicatorRow}>
                <Ionicons name="lock-closed-outline" size={13} color={colors.textMuted} style={{ marginRight: 5 }} />
                <Text style={[styles.securityIndicatorText, { color: colors.textMuted }]}>
                  Your data is encrypted and secure.
                </Text>
              </View>
            </View>

            {/* Bottom Trust Features */}
            <View style={styles.trustRow}>
              <View style={[styles.trustCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} style={{ marginBottom: 6 }} />
                <Text style={[styles.trustTitle, { color: colors.textPrimary }]}>Secure</Text>
                <Text style={[styles.trustSub, { color: colors.textMuted }]}>End-to-end encryption</Text>
              </View>

              <View style={[styles.trustCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <Ionicons name="flash-outline" size={20} color={colors.primary} style={{ marginBottom: 6 }} />
                <Text style={[styles.trustTitle, { color: colors.textPrimary }]}>Reliable</Text>
                <Text style={[styles.trustSub, { color: colors.textMuted }]}>99.9% uptime</Text>
              </View>

              <View style={[styles.trustCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <Ionicons name="people-outline" size={20} color={colors.primary} style={{ marginBottom: 6 }} />
                <Text style={[styles.trustTitle, { color: colors.textPrimary }]}>Trusted</Text>
                <Text style={[styles.trustSub, { color: colors.textMuted }]}>Happy customers</Text>
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
  offlineBanner: {
    backgroundColor: 'hsl(40, 84%, 55%)',
    paddingVertical: 8,
    alignItems: 'center',
  },
  offlineText: {
    color: '#000000',
    fontWeight: 'bold',
    fontSize: 12,
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
    marginBottom: 16,
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
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  countryCodeBadge: {
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countryCodeText: {
    fontWeight: '700',
    fontSize: 15,
  },
  inputDivider: {
    width: 1,
    height: 24,
  },
  phoneIcon: {
    marginLeft: 12,
    marginRight: 4,
  },
  input: {
    flex: 1,
    height: 52,
    paddingRight: 14,
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  errorText: {
    fontSize: 12,
    marginTop: 8,
    fontWeight: '500',
  },
  button: {
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
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



