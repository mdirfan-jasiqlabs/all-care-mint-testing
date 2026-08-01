// ─── apps/customer-mobile/src/screens/BookingConfirmationScreen.tsx ───
// Source: DLD Section 8.1 & 6.2.7 — Booking Confirmation & Cancellation Screen

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
import { apiClient } from '../services/api';

export default function BookingConfirmationScreen({ navigation, route }: any) {
  const { bookingId } = route.params;

  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchBookingDetails = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get(`/api/v1/bookings/${bookingId}`);
      if (data.success) {
        setBooking(data.data);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to retrieve booking status.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookingDetails();
  }, []);

  const performCancellation = async () => {
    try {
      setSubmitting(true);
      const data = await apiClient.patch(`/api/v1/bookings/me/${bookingId}/cancel`, {
        reason: 'Cancelled by customer from mobile app',
      });

      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to cancel booking.');
      }

      Alert.alert('Cancelled', 'Your booking has been cancelled successfully.');
      fetchBookingDetails();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelBooking = () => {
    const confirmMessage = 'Are you sure you want to cancel this booking?';
    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof (window as any).confirm === 'function') {
      if ((window as any).confirm(confirmMessage)) {
        performCancellation();
      }
    } else {
      Alert.alert('Cancel Booking', confirmMessage, [
        { text: 'No', style: 'cancel' },
        { text: 'Yes, Cancel', style: 'destructive', onPress: performCancellation },
      ]);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  const isCancellable = booking && ['PENDING', 'ASSIGNED'].includes(booking.status);

  return (
    <View style={styles.outerContainer}>
      <ScrollView contentContainerStyle={styles.container} style={styles.scrollContainer}>
      <View style={styles.successIconContainer}>
        {booking?.status === 'CANCELLED' ? (
          <View style={[styles.circle, styles.circleCancelled]}>
            <Text style={styles.checkmark}>✕</Text>
          </View>
        ) : (
          <View style={[styles.circle, styles.circleSuccess]}>
            <Text style={styles.checkmark}>✓</Text>
          </View>
        )}
      </View>

      <Text style={styles.title}>
        {booking?.status === 'CANCELLED' ? 'Booking Cancelled' : 'Booking Placed Successfully!'}
      </Text>
      
      {booking && (
        <View style={styles.detailsBox}>
          <Text style={styles.refLabel}>Booking Reference</Text>
          <Text style={styles.refText}>{booking.bookingReference}</Text>
          
          <View style={styles.divider} />

          <Text style={styles.refLabel}>Status</Text>
          <Text style={[styles.statusText, booking.status === 'CANCELLED' ? styles.textRed : styles.textYellow]}>
            {booking.status}
          </Text>

          <View style={styles.divider} />

          <Text style={styles.refLabel}>Service</Text>
          <Text style={styles.valText}>{booking.serviceNameSnapshot}</Text>

          <View style={styles.divider} />

          <Text style={styles.refLabel}>Scheduled For</Text>
          <Text style={styles.valText}>
            {new Date(booking.slotDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            {' • '}
            {booking.slotLabelSnapshot}
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={styles.homeBtn}
        onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Home' }] })}
      >
        <Text style={styles.homeBtnText}>Go to Dashboard</Text>
      </TouchableOpacity>

      {isCancellable && (
        <TouchableOpacity
          style={[styles.cancelBtn, submitting && styles.cancelBtnDisabled]}
          onPress={handleCancelBooking}
          disabled={submitting}
        >
          {submitting ? <ActivityIndicator size="small" color="#f87171" /> : <Text style={styles.cancelBtnText}>Cancel Booking</Text>}
        </TouchableOpacity>
      )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: 'hsl(224, 71%, 4%)',
  },
  scrollContainer: {
    flex: 1,
  },
  container: {
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: 'hsl(224, 71%, 4%)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successIconContainer: {
    marginBottom: 24,
  },
  circle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 2,
    borderColor: '#10b981',
  },
  circleCancelled: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 2,
    borderColor: '#ef4444',
  },
  checkmark: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 32,
  },
  detailsBox: {
    width: '100%',
    backgroundColor: 'rgba(17, 24, 39, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 32,
  },
  refLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  refText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 4,
  },
  statusText: {
    fontSize: 15,
    fontWeight: 'bold',
    marginTop: 4,
  },
  valText: {
    fontSize: 14,
    color: '#ffffff',
    marginTop: 4,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginVertical: 12,
  },
  textYellow: {
    color: '#fbbf24',
  },
  textRed: {
    color: '#f87171',
  },
  homeBtn: {
    backgroundColor: '#10b981',
    width: '100%',
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  homeBtnText: {
    color: '#020617',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelBtn: {
    backgroundColor: 'transparent',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderWidth: 1.5,
    width: '100%',
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnDisabled: {
    opacity: 0.5,
  },
  cancelBtnText: {
    color: '#f87171',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
