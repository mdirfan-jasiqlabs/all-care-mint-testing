// ─── apps/customer-mobile/src/screens/AddressSelectionScreen.tsx ───
// Source: DLD Section 8.1 & 6.1 — Address Selection Screen

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import * as storage from '../utils/storage';
import { getBaseUrl } from '../utils/api';

export default function AddressSelectionScreen({ navigation, route }: any) {
  const { serviceId } = route.params;
  const token = storage.getAccessToken() || '';
  const baseUrl = getBaseUrl();

  const [addresses, setAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  // Form state
  const [label, setLabel] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchAddresses = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${baseUrl}/api/v1/addresses`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setAddresses(data.data);
      }
    } catch (err: any) {
      Alert.alert('Error', 'Failed to load addresses.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  const handleAddAddress = async () => {
    if (!label.trim() || !addressLine1.trim() || !city.trim() || !pincode.trim()) {
      Alert.alert('Validation Error', 'Please fill in all required fields.');
      return;
    }

    if (!/^[1-9][0-9]{5}$/.test(pincode)) {
      Alert.alert('Validation Error', 'Please enter a valid 6-digit Indian PIN code.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`${baseUrl}/api/v1/addresses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          label,
          addressLine1,
          addressLine2: addressLine2 || undefined,
          city,
          pincode,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to add address.');
      }

      setLabel('');
      setAddressLine1('');
      setAddressLine2('');
      setCity('');
      setPincode('');
      setIsAdding(false);
      fetchAddresses();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const renderAddressItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.addressCard}
      onPress={() => navigation.navigate('SlotSelection', { serviceId, addressId: item.id })}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.addressLabel}>{item.label}</Text>
        <Text style={styles.addressDetails}>
          {item.addressLine1}
          {item.addressLine2 ? `, ${item.addressLine2}` : ''}
        </Text>
        <Text style={styles.addressCity}>
          {item.city} - {item.pincode}
        </Text>
      </View>
      <Text style={styles.selectText}>Select →</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Select Delivery Address</Text>
        <Text style={styles.subtitle}>Where would you like to receive the service?</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#10b981" style={{ marginTop: 40 }} />
      ) : isAdding ? (
        <ScrollView style={styles.formContainer} keyboardShouldPersistTaps="handled">
          <Text style={styles.formTitle}>Add New Address</Text>

          <TextInput
            placeholder="Label (e.g. Home, Office) *"
            placeholderTextColor="#94a3b8"
            style={styles.input}
            value={label}
            onChangeText={setLabel}
          />
          <TextInput
            placeholder="Address Line 1 *"
            placeholderTextColor="#94a3b8"
            style={styles.input}
            value={addressLine1}
            onChangeText={setAddressLine1}
          />
          <TextInput
            placeholder="Address Line 2 (Optional)"
            placeholderTextColor="#94a3b8"
            style={styles.input}
            value={addressLine2}
            onChangeText={setAddressLine2}
          />
          <TextInput
            placeholder="City *"
            placeholderTextColor="#94a3b8"
            style={styles.input}
            value={city}
            onChangeText={setCity}
          />
          <TextInput
            placeholder="Pincode (6 digits) *"
            placeholderTextColor="#94a3b8"
            keyboardType="number-pad"
            style={styles.input}
            value={pincode}
            onChangeText={setPincode}
            maxLength={6}
          />

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.btn, styles.btnCancel]}
              onPress={() => setIsAdding(false)}
            >
              <Text style={styles.btnCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.btnSubmit]}
              onPress={handleAddAddress}
              disabled={submitting}
            >
              {submitting ? <ActivityIndicator size="small" color="#020617" /> : <Text style={styles.btnSubmitText}>Save Address</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        <>
          <FlatList
            data={addresses}
            keyExtractor={(item) => item.id}
            renderItem={renderAddressItem}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No saved addresses found. Please add one below.</Text>
            }
          />

          {addresses.length < 5 && (
            <TouchableOpacity style={styles.addBtn} onPress={() => setIsAdding(true)}>
              <Text style={styles.addBtnText}>+ Add New Address</Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'hsl(224, 71%, 4%)',
    padding: 16,
  },
  header: {
    marginBottom: 24,
    marginTop: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
  },
  listContent: {
    paddingBottom: 24,
  },
  addressCard: {
    backgroundColor: 'rgba(17, 24, 39, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addressLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  addressDetails: {
    fontSize: 13,
    color: '#cbd5e1',
    lineHeight: 18,
  },
  addressCity: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 2,
  },
  selectText: {
    color: '#10b981',
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 8,
  },
  addBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  addBtnText: {
    color: '#10b981',
    fontSize: 15,
    fontWeight: 'bold',
  },
  emptyText: {
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 40,
    fontSize: 14,
  },
  formContainer: {
    backgroundColor: 'rgba(17, 24, 39, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    padding: 20,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 20,
  },
  input: {
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    color: '#ffffff',
    fontSize: 15,
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginBottom: 16,
  },
  btn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnCancel: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  btnCancelText: {
    color: '#94a3b8',
    fontWeight: 'bold',
    fontSize: 15,
  },
  btnSubmit: {
    backgroundColor: '#10b981',
  },
  btnSubmitText: {
    color: '#020617',
    fontWeight: 'bold',
    fontSize: 15,
  },
});
