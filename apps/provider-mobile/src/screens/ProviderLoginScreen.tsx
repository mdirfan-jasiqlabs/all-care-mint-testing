import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/root.types';

type ProviderLoginScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'ProviderLogin'
>;

interface Props {
  navigation: ProviderLoginScreenNavigationProp;
}

export default function ProviderLoginScreen({ navigation }: Props) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isOffline, setIsOffline] = useState(false); // Can be connected to NetInfo

  const handleSendCode = () => {
    setError('');

    // Validation: 10-digit check
    const cleanNum = phoneNumber.replace(/\D/g, '');
    if (cleanNum.length !== 10) {
      setError('Please enter a valid 10-digit number');
      return;
    }

    setLoading(true);

    // Simulate OTP dispatch
    setTimeout(() => {
      setLoading(false);
      navigation.navigate('ProviderOtp', {
        mobileNumber: `${countryCode}${cleanNum}`,
      });
    }, 1000);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {isOffline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>
            Internet disconnected. Check connectivity.
          </Text>
        </View>
      )}

      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>All Care Mint — Provider Partner login</Text>

          <Text style={styles.label}>Enter your mobile number</Text>

          <View style={styles.inputContainer}>
            <TouchableOpacity style={styles.countrySelector}>
              <Text style={styles.countrySelectorText}>{countryCode}</Text>
            </TouchableOpacity>
            <TextInput
              style={[styles.input, error ? styles.inputError : null]}
              placeholder="(999) 999-9999"
              placeholderTextColor="hsl(215, 20%, 45%)"
              keyboardType="phone-pad"
              value={phoneNumber}
              onChangeText={(text) => {
                setPhoneNumber(text);
                if (error) setError('');
              }}
              editable={!loading}
            />
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.button, loading ? styles.buttonDisabled : null]}
            onPress={handleSendCode}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="hsl(210, 40%, 98%)" />
            ) : (
              <Text style={styles.buttonText}>Send Verification Code</Text>
            )}
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
  offlineBanner: {
    backgroundColor: 'hsl(40, 84%, 55%)',
    paddingVertical: 8,
    alignItems: 'center',
  },
  offlineText: {
    color: 'hsl(224, 71%, 4%)',
    fontWeight: 'bold',
    fontSize: 12,
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
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    color: 'hsl(215, 20%, 65%)',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  countrySelector: {
    backgroundColor: 'hsl(217, 32%, 17%)',
    height: 50,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
    borderWidth: 1,
    borderColor: 'hsl(217, 32%, 17%)',
  },
  countrySelectorText: {
    color: 'hsl(210, 40%, 98%)',
    fontWeight: '600',
  },
  input: {
    flex: 1,
    backgroundColor: 'hsl(217, 32%, 12%)',
    height: 50,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    paddingHorizontal: 16,
    color: 'hsl(210, 40%, 98%)',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'hsl(217, 32%, 17%)',
  },
  inputError: {
    borderColor: 'hsl(350, 84%, 55%)',
  },
  errorText: {
    color: 'hsl(350, 84%, 55%)',
    fontSize: 13,
    marginBottom: 16,
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
});
