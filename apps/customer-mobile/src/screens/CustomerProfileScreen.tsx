import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  Platform,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/root.types';
import * as storage from '../utils/storage';
import { apiClient } from '../services/api';
import BottomNavBar from '../components/BottomNavBar';
import { useTheme } from '../theme/ThemeContext';

type CustomerProfileScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Profile'
>;

interface Props {
  navigation: CustomerProfileScreenNavigationProp;
}

export default function CustomerProfileScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const [name, setName] = useState('');
  const [initialName, setInitialName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [createdAt, setCreatedAt] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchProfile = async () => {
    setError('');
    const token = storage.getAccessToken();
    if (!token) {
      navigation.replace('PhoneInput');
      return;
    }

    try {
      const result = await apiClient.get('/api/v1/customers/me');

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to load profile.');
      }

      const { displayName, mobileNumber: mob, createdAt: created } = result.data;
      setName(displayName || '');
      setInitialName(displayName || '');
      setMobileNumber(mob || '');
      storage.setUserName(displayName || '');
      
      const formattedDate = new Date(created).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      setCreatedAt(formattedDate);
      setLoading(false);
    } catch (err: any) {
      if (err.status === 401) {
        handleLogout();
        return;
      }
      setLoading(false);
      setError(err.message || 'Server failed to retrieve profile. Please try again.');
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSave = async () => {
    setError('');
    setSuccessMsg('');
    if (!name.trim()) {
      setError('Name cannot be blank');
      return;
    }

    const token = storage.getAccessToken();
    if (!token) {
      navigation.replace('PhoneInput');
      return;
    }

    setSaving(true);

    try {
      const result = await apiClient.patch('/api/v1/customers/me', { name });

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to save changes.');
      }

      storage.setUserName(name);
      setInitialName(name);
      setSuccessMsg('Profile updated.');
      setSaving(false);
    } catch (err: any) {
      setSaving(false);
      setError(err.message || 'Server failed to save name. Please try again.');
    }
  };

  const handleLogout = async () => {
    const token = storage.getAccessToken();
    const refresh = await storage.getRefreshToken();
    
    // Call logout API asynchronously
    if (token) {
      try {
        await apiClient.post('/api/v1/auth/logout', { refreshToken: refresh });
      } catch (e) {
        // ignore logout call error
      }
    }

    storage.clearAccessToken();
    await storage.clearRefreshToken();
    storage.clearUserName();
    navigation.reset({
      index: 0,
      routes: [{ name: 'PhoneInput' }],
    });
  };

  const isDirty = name !== initialName;

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>My Profile</Text>
            <View style={[styles.badge, { backgroundColor: colors.badgeBg, borderColor: colors.border }]}>
              <Text style={[styles.badgeText, { color: colors.primary }]}>CUSTOMER</Text>
            </View>
          </View>

          <Text style={[styles.label, { color: colors.textSecondary }]}>Display Name</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.inputBackground,
                borderColor: error === 'Name cannot be blank' ? colors.danger : colors.inputBorder,
                color: colors.inputText,
              },
            ]}
            placeholder="Enter your display name"
            placeholderTextColor={colors.placeholderText}
            value={name}
            onChangeText={(text) => {
              setName(text);
              if (error) setError('');
            }}
            editable={!saving}
          />
          {error === 'Name cannot be blank' ? (
            <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
          ) : null}

          <View style={styles.labelRow}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Mobile Number</Text>
            <View style={styles.lockBadge}>
              <Text style={styles.lockIcon}>🔒</Text>
              <Text style={[styles.lockBadgeText, { color: colors.textMuted }]}>LOCKED</Text>
            </View>
          </View>
          <View style={[styles.readOnlyContainer, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
            <Text style={[styles.readOnlyText, { color: colors.textMuted }]}>{mobileNumber}</Text>
          </View>

          <Text style={[styles.label, { color: colors.textSecondary }]}>Account Created</Text>
          <View style={[styles.readOnlyContainer, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
            <Text style={[styles.readOnlyText, { color: colors.textMuted }]}>{createdAt}</Text>
          </View>

          {error && error !== 'Name cannot be blank' ? (
            <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
          ) : null}

          {successMsg ? <Text style={[styles.successText, { color: colors.primary }]}>{successMsg}</Text> : null}

          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: colors.primary },
              !isDirty || saving ? styles.buttonDisabled : null,
            ]}
            onPress={handleSave}
            disabled={!isDirty || saving}
          >
            {saving ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>Save Changes</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={[styles.signOutButton, { borderColor: colors.danger }]} onPress={handleLogout}>
            <Text style={[styles.signOutButtonText, { color: colors.danger }]}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <BottomNavBar activeTab="Profile" navigation={navigation} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
  },
  scrollView: {
    flex: 1,
  },
  container: {
    paddingHorizontal: 20,
    paddingVertical: 24,
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingBottom: 12,
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  badge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  lockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lockIcon: {
    fontSize: 10,
    marginRight: 4,
  },
  lockBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  input: {
    height: 46,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 15,
    borderWidth: 1,
    marginBottom: 16,
  },
  readOnlyContainer: {
    height: 46,
    borderRadius: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: 16,
  },
  readOnlyText: {
    fontSize: 15,
  },
  errorText: {
    fontSize: 13,
    marginBottom: 16,
    textAlign: 'center',
  },
  successText: {
    fontSize: 13,
    marginBottom: 16,
    textAlign: 'center',
  },
  button: {
    height: 46,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  signOutButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  signOutButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});

