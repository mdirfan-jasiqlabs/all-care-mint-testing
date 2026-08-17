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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
        style={styles.container}
      >
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Customer Sign In</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Receive 6-digit OTP verification code via secure SMS transaction.
          </Text>

          <Text style={[styles.label, { color: colors.textSecondary }]}>Mobile Number (India)</Text>

          <View style={styles.inputContainer}>
            <TouchableOpacity style={[styles.countrySelector, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
              <Text style={[styles.countrySelectorText, { color: colors.textPrimary }]}>{countryCode}</Text>
            </TouchableOpacity>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.inputBackground,
                  borderColor: error ? colors.danger : colors.inputBorder,
                  color: colors.inputText,
                },
              ]}
              placeholder="(999) 999-9999"
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
          >
            {loading ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>Send Verification Code ➔</Text>
            )}
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
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 18,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  countrySelector: {
    height: 50,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
    borderWidth: 1,
  },
  countrySelectorText: {
    fontWeight: '600',
  },
  input: {
    flex: 1,
    height: 50,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
  },
  errorText: {
    fontSize: 13,
    marginBottom: 16,
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
});


