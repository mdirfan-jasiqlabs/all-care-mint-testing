// ─── apps/customer-mobile/src/screens/BookingSummaryScreen.tsx ───
// Source: DLD Section 8.1 & 6.2.3 — Booking Summary & Confirmation Screen

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import * as storage from '../utils/storage';
import { getBaseUrl } from '../utils/api';

const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export default function BookingSummaryScreen({ navigation, route }: any) {
  const { serviceId, addressId, slotId, date } = route.params;
  const token = storage.getAccessToken() || '';
  const baseUrl = getBaseUrl();

  const [service, setService] = useState<any>(null);
  const [address, setAddress] = useState<any>(null);
  const [timeSlot, setTimeSlot] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'CASH_ON_SERVICE'>('CASH_ON_SERVICE');
  const [idempotencyKey, setIdempotencyKey] = useState<string>('');

  // 10-minute countdown (600 seconds)
  const [timeLeft, setTimeLeft] = useState(600);
  const [lockExpired, setLockExpired] = useState(false);

  useEffect(() => {
    setIdempotencyKey(generateUUID());

    const loadData = async () => {
      try {
        setLoading(true);
        // We can fetch category list first or query services directly.
        // Let's fetch details from API
        const addrRes = await fetch(`${baseUrl}/api/v1/addresses`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const addrData = await addrRes.json();
        if (addrData.success) {
          const selectedAddr = addrData.data.find((a: any) => a.id === addressId);
          setAddress(selectedAddr);
        }

        // Fetch service directly from DB using custom or public endpoint,
        // or query categories/services list to find the details.
        // Let's call the public category service list to find details
        const catRes = await fetch(`${baseUrl}/api/v1/catalog/categories`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const catData = await catRes.json();
        if (catData.success) {
          let foundService = null;
          for (const cat of catData.data) {
            const svcRes = await fetch(
              `${baseUrl}/api/v1/catalog/categories/${cat.id}/services`,
              { headers: { 'Authorization': `Bearer ${token}` } },
            );
            const svcData = await svcRes.json();
            if (svcData.success) {
              const matched = svcData.data.find((s: any) => s.id === serviceId);
              if (matched) {
                foundService = matched;
                break;
              }
            }
          }
          setService(foundService);
        }

        // Fetch slots to get slot label
        const slotRes = await fetch(
          `${baseUrl}/api/v1/bookings/slots?service_id=${serviceId}&date=${date}`,
          { headers: { 'Authorization': `Bearer ${token}` } },
        );
        const slotData = await slotRes.json();
        if (slotData.success) {
          const selectedSlot = slotData.data.find((s: any) => s.id === slotId);
          setTimeSlot(selectedSlot);
        }
      } catch (err) {
        Alert.alert('Error', 'Failed to load summary data.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Timer countdown hook
  useEffect(() => {
    if (timeLeft <= 0) {
      setLockExpired(true);
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleConfirmBooking = async () => {
    if (lockExpired) {
      Alert.alert(
        'Lock Expired',
        'Your temporary slot lock has expired. Please go back and select the slot again.',
      );
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`${baseUrl}/api/v1/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-idempotency-key': idempotencyKey,
        },
        body: JSON.stringify({
          serviceId,
          slotId,
          slotDate: date,
          addressId,
          paymentMethod,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to place booking.');
      }

      // Success! Navigate to confirmation page
      navigation.replace('BookingConfirmation', {
        bookingId: data.data.bookingId,
        status: data.data.status,
      });
    } catch (err: any) {
      Alert.alert('Checkout Failure', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  return (
    <View style={styles.outerContainer}>
      <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Confirm Booking</Text>
        <Text style={styles.subtitle}>Review your service details before placing booking</Text>
      </View>

      {/* Countdown Banner */}
      <View style={[styles.timerBanner, lockExpired ? styles.timerExpired : styles.timerActive]}>
        <Text style={styles.timerText}>
          {lockExpired
            ? 'Lock Expired. Please restart checkout.'
            : `Holding slot for ${formatTime(timeLeft)} minutes`}
        </Text>
      </View>

      {/* Summary Card */}
      <View style={styles.card}>
        <Text style={styles.cardSectionTitle}>Service</Text>
        <Text style={styles.serviceName}>{service?.name || 'Loading Service...'}</Text>
        <Text style={styles.servicePrice}>₹{parseFloat(service?.fixedPrice || '0').toFixed(2)}</Text>

        <View style={styles.divider} />

        <Text style={styles.cardSectionTitle}>Scheduled Date & Time</Text>
        <Text style={styles.detailText}>
          {new Date(date).toLocaleDateString('en-IN', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </Text>
        <Text style={styles.detailSubText}>{timeSlot?.label || 'Loading Time...'}</Text>

        <View style={styles.divider} />

        <Text style={styles.cardSectionTitle}>Delivery Address</Text>
        <Text style={styles.detailText}>
          {address ? `${address.label} — ${address.addressLine1}` : 'Loading address...'}
        </Text>
        {address?.addressLine2 && <Text style={styles.detailSubText}>{address.addressLine2}</Text>}
        <Text style={styles.detailSubText}>
          {address?.city} - {address?.pincode}
        </Text>

        <View style={styles.divider} />

        <Text style={styles.cardSectionTitle}>Payment Mode</Text>
        <TouchableOpacity
          style={[styles.paymentOption, styles.paymentOptionActive]}
          disabled={true}
        >
          <Text style={styles.paymentText}>Cash on Service</Text>
          <Text style={styles.paymentSubtext}>Pay directly to the provider on completion</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.confirmBtn, (lockExpired || submitting) && styles.confirmBtnDisabled]}
        disabled={lockExpired || submitting}
        onPress={handleConfirmBooking}
      >
        {submitting ? (
          <ActivityIndicator size="small" color="#020617" />
        ) : (
          <Text style={styles.confirmBtnText}>Confirm Booking</Text>
        )}
      </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: 'hsl(224, 71%, 4%)',
    ...Platform.select({
      web: {
        position: 'absolute' as any,
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        height: '100%' as any,
        overflow: 'hidden' as any,
      }
    })
  },
  container: {
    flex: 1,
    padding: 16,
    ...Platform.select({
      web: {
        overflowY: 'auto' as any,
      }
    })
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: 'hsl(224, 71%, 4%)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: 20,
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
  timerBanner: {
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  timerActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  timerExpired: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  timerText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  card: {
    backgroundColor: 'rgba(17, 24, 39, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
  },
  cardSectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  servicePrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#10b981',
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginVertical: 18,
  },
  detailText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  detailSubText: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 2,
  },
  paymentOption: {
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
  },
  paymentOptionActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    borderWidth: 1.5,
    borderColor: '#10b981',
  },
  paymentText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#10b981',
  },
  paymentSubtext: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  confirmBtn: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 48,
  },
  confirmBtnDisabled: {
    backgroundColor: '#334155',
    opacity: 0.6,
  },
  confirmBtnText: {
    color: '#020617',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
