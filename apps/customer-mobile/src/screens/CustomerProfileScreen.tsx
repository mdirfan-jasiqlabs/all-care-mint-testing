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
import { getBaseUrl } from '../utils/api';

type CustomerProfileScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Profile'
>;

interface Props {
  navigation: CustomerProfileScreenNavigationProp;
}

export default function CustomerProfileScreen({ navigation }: Props) {
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
      const baseUrl = getBaseUrl();
      const response = await fetch(`${baseUrl}/api/v1/customers/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        if (response.status === 401) {
          // Token expired, clear and go to login
          handleLogout();
          return;
        }
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
      const baseUrl = getBaseUrl();
      const response = await fetch(`${baseUrl}/api/v1/customers/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
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
        const baseUrl = getBaseUrl();
        await fetch(`${baseUrl}/api/v1/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ refreshToken: refresh }),
        });
      } catch (e) {
        // ignore logout call error
      }
    }

    storage.clearAccessToken();
    await storage.clearRefreshToken();
    storage.clearUserName();
    navigation.replace('PhoneInput');
  };

  const isDirty = name !== initialName;

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="hsl(150, 84%, 40%)" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>My Profile</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>CUSTOMER</Text>
            </View>
          </View>

          <Text style={styles.label}>Display Name</Text>
          <TextInput
            style={[styles.input, error === 'Name cannot be blank' ? styles.inputError : null]}
            placeholder="Enter your display name"
            placeholderTextColor="hsl(215, 20%, 45%)"
            value={name}
            onChangeText={(text) => {
              setName(text);
              if (error) setError('');
            }}
            editable={!saving}
          />
          {error === 'Name cannot be blank' ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : null}

          <View style={styles.labelRow}>
            <Text style={styles.label}>Mobile Number</Text>
            <View style={styles.lockBadge}>
              <Text style={styles.lockIcon}>🔒</Text>
              <Text style={styles.lockBadgeText}>LOCKED</Text>
            </View>
          </View>
          <View style={styles.readOnlyContainer}>
            <Text style={styles.readOnlyText}>{mobileNumber}</Text>
          </View>

          <Text style={styles.label}>Account Created</Text>
          <View style={styles.readOnlyContainer}>
            <Text style={styles.readOnlyText}>{createdAt}</Text>
          </View>

          {error && error !== 'Name cannot be blank' ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : null}

          {successMsg ? <Text style={styles.successText}>{successMsg}</Text> : null}

          <TouchableOpacity
            style={[
              styles.button,
              !isDirty || saving ? styles.buttonDisabled : null,
            ]}
            onPress={handleSave}
            disabled={!isDirty || saving}
          >
            {saving ? (
              <ActivityIndicator color="hsl(224, 71%, 4%)" />
            ) : (
              <Text style={styles.buttonText}>Save Changes</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.signOutButton} onPress={handleLogout}>
            <Text style={styles.signOutButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'hsl(224, 71%, 4%)',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'hsl(215, 20%, 65%)',
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'hsl(217, 32%, 15%)',
    paddingBottom: 12,
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'hsl(210, 40%, 98%)',
  },
  badge: {
    backgroundColor: 'hsl(140, 84%, 10%)',
    borderColor: 'hsl(140, 84%, 30%)',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeText: {
    color: 'hsl(150, 84%, 40%)',
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
    color: 'hsl(215, 20%, 65%)',
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
    color: 'hsl(215, 20%, 50%)',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: 'hsl(217, 32%, 12%)',
    height: 46,
    borderRadius: 8,
    paddingHorizontal: 16,
    color: 'hsl(210, 40%, 98%)',
    fontSize: 15,
    borderWidth: 1,
    borderColor: 'hsl(217, 32%, 17%)',
    marginBottom: 16,
  },
  inputError: {
    borderColor: 'hsl(350, 84%, 55%)',
  },
  readOnlyContainer: {
    backgroundColor: 'hsl(217, 32%, 8%)',
    height: 46,
    borderRadius: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'hsl(217, 32%, 12%)',
    marginBottom: 16,
  },
  readOnlyText: {
    color: 'hsl(215, 20%, 50%)',
    fontSize: 15,
  },
  errorText: {
    color: 'hsl(350, 84%, 55%)',
    fontSize: 13,
    marginBottom: 16,
    textAlign: 'center',
  },
  successText: {
    color: 'hsl(140, 84%, 55%)',
    fontSize: 13,
    marginBottom: 16,
    textAlign: 'center',
  },
  button: {
    backgroundColor: 'hsl(150, 84%, 40%)',
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
    color: 'hsl(224, 71%, 4%)',
    fontSize: 15,
    fontWeight: 'bold',
  },
  signOutButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: 'rgba(239, 68, 68, 0.25)',
    borderWidth: 1,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  signOutButtonText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
