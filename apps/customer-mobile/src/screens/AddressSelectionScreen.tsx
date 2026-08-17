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
} from 'react-native';
import * as storage from '../utils/storage';
import { apiClient } from '../services/api';
import { ToastContainer, ToastItem, ToastType } from '../components/ToastContainer';
import { useTheme } from '../theme/ThemeContext';

export default function AddressSelectionScreen({ navigation, route }: any) {
  const { colors } = useTheme();
  const { serviceId } = route.params;

  const [addresses, setAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  // Toast state
  const [toastQueue, setToastQueue] = useState<ToastItem[]>([]);
  const showToast = (message: string, type: ToastType = 'success') => {
    setToastQueue((prev) => [...prev, { id: `${Date.now()}-${Math.random()}`, message, type }]);
  };
  const dismissToast = (id: string) => {
    setToastQueue((prev) => prev.filter((t) => t.id !== id));
  };

  // Form state
  const [label, setLabel] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchAddresses = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get('/api/v1/addresses');
      if (data.success) {
        setAddresses(data.data);
      }
    } catch (err: any) {
      showToast('Failed to load addresses.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  const handleAddAddress = async () => {
    setErrorMsg('');
    if (!label.trim() || !addressLine1.trim() || !city.trim() || !pincode.trim()) {
      setErrorMsg('Please fill in all required fields.');
      return;
    }

    if (!/^[1-9][0-9]{5}$/.test(pincode)) {
      setErrorMsg('Please enter a valid 6-digit Indian PIN code.');
      return;
    }

    try {
      setSubmitting(true);
      const data = await apiClient.post('/api/v1/addresses', {
        label,
        addressLine1,
        addressLine2: addressLine2 || undefined,
        city,
        pincode,
      });

      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to add address.');
      }

      showToast('Address added successfully.', 'success');
      setLabel('');
      setAddressLine1('');
      setAddressLine2('');
      setCity('');
      setPincode('');
      setErrorMsg('');
      setIsAdding(false);
      fetchAddresses();
    } catch (err: any) {
      setErrorMsg(err.message);
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    try {
      setLoading(true);
      const data = await apiClient.delete(`/api/v1/addresses/${id}`);
      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to delete address.');
      }
      showToast('Address deleted successfully.', 'success');
      fetchAddresses();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const renderAddressItem = ({ item }: { item: any }) => (
    <View style={[styles.addressCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      <TouchableOpacity
        style={{ flex: 1 }}
        onPress={() => navigation.navigate('SlotSelection', { serviceId, addressId: item.id })}
      >
        <Text style={[styles.addressLabel, { color: colors.textPrimary }]}>{item.label}</Text>
        <Text style={[styles.addressDetails, { color: colors.textSecondary }]}>
          {item.addressLine1}
          {item.addressLine2 ? `, ${item.addressLine2}` : ''}
        </Text>
        <Text style={[styles.addressCity, { color: colors.textMuted }]}>
          {item.city} - {item.pincode}
        </Text>
      </TouchableOpacity>
      <View style={{ gap: 8, alignItems: 'flex-end', justifyContent: 'center' }}>
        <TouchableOpacity
          onPress={() => navigation.navigate('SlotSelection', { serviceId, addressId: item.id })}
        >
          <Text style={[styles.selectText, { color: colors.primary }]}>Select →</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleDeleteAddress(item.id)}
          style={{ marginTop: 8 }}
        >
          <Text style={{ color: colors.danger, fontWeight: 'bold', fontSize: 13 }}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Select Delivery Address</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Where would you like to receive the service?</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : isAdding ? (
        <ScrollView style={[styles.formContainer, { backgroundColor: colors.card, borderColor: colors.cardBorder }]} keyboardShouldPersistTaps="handled">
          <Text style={[styles.formTitle, { color: colors.textPrimary }]}>Add New Address</Text>

          {errorMsg ? <Text style={[styles.errorText, { color: colors.danger }]}>{errorMsg}</Text> : null}

          <TextInput
            placeholder="Label (e.g. Home, Office) *"
            placeholderTextColor={colors.placeholderText}
            style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.inputText }]}
            value={label}
            onChangeText={setLabel}
          />
          <TextInput
            placeholder="Address Line 1 *"
            placeholderTextColor={colors.placeholderText}
            style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.inputText }]}
            value={addressLine1}
            onChangeText={setAddressLine1}
          />
          <TextInput
            placeholder="Address Line 2 (Optional)"
            placeholderTextColor={colors.placeholderText}
            style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.inputText }]}
            value={addressLine2}
            onChangeText={setAddressLine2}
          />
          <TextInput
            placeholder="City *"
            placeholderTextColor={colors.placeholderText}
            style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.inputText }]}
            value={city}
            onChangeText={setCity}
          />
          <TextInput
            placeholder="Pincode (6 digits) *"
            placeholderTextColor={colors.placeholderText}
            keyboardType="number-pad"
            style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.inputText }]}
            value={pincode}
            onChangeText={setPincode}
            maxLength={6}
          />

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.btn, styles.btnCancel, { borderColor: colors.border }]}
              onPress={() => setIsAdding(false)}
            >
              <Text style={[styles.btnCancelText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.btnSubmit, { backgroundColor: colors.primary }]}
              onPress={handleAddAddress}
              disabled={submitting}
            >
              {submitting ? <ActivityIndicator size="small" color={colors.primaryForeground} /> : <Text style={[styles.btnSubmitText, { color: colors.primaryForeground }]}>Save Address</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        <>
          <FlatList
            style={styles.scrollContainer}
            data={addresses}
            keyExtractor={(item) => item.id}
            renderItem={renderAddressItem}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>You need to add an address first</Text>
            }
          />

          {addresses.length < 5 && (
            <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.tabActiveBg, borderColor: colors.border }]} onPress={() => setIsAdding(true)}>
              <Text style={[styles.addBtnText, { color: colors.primary }]}>Add Address</Text>
            </TouchableOpacity>
          )}
        </>
      )}
      <ToastContainer toastQueue={toastQueue} onDismiss={dismissToast} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  scrollContainer: {
    flex: 1,
  },
  header: {
    marginBottom: 24,
    marginTop: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  listContent: {
    paddingBottom: 24,
  },
  addressCard: {
    borderWidth: 1,
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
    marginBottom: 4,
  },
  addressDetails: {
    fontSize: 13,
    lineHeight: 18,
  },
  addressCity: {
    fontSize: 13,
    marginTop: 2,
  },
  selectText: {
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 8,
  },
  addBtn: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  addBtnText: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 14,
  },
  errorText: {
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  formContainer: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
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
  },
  btnCancelText: {
    fontWeight: 'bold',
    fontSize: 15,
  },
  btnSubmit: {},
  btnSubmitText: {
    fontWeight: 'bold',
    fontSize: 15,
  },
});

