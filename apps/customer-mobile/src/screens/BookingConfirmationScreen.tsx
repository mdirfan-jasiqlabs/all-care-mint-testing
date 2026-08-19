// ─── apps/customer-mobile/src/screens/BookingConfirmationScreen.tsx ───
// Source: DLD Section 8.1 & 6.2.7 — Booking Confirmation & Cancellation Screen

import React, { useState, useEffect, useMemo } from 'react';
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
import { apiClient } from '../services/api';
import { useTheme } from '../theme/ThemeContext';

export default function BookingConfirmationScreen({ navigation, route }: any) {
  const { colors } = useTheme();
  const { bookingId, bookingIds: rawBookingIds } = route.params || {};

  const targetBookingIds: string[] = useMemo(() => {
    if (Array.isArray(rawBookingIds) && rawBookingIds.length > 0) {
      return Array.from(new Set(rawBookingIds));
    }
    return bookingId ? [bookingId] : [];
  }, [rawBookingIds, bookingId]);

  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchBookingDetails = async () => {
    if (targetBookingIds.length === 0) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const promises = targetBookingIds.map((id) =>
        apiClient.get(`/api/v1/bookings/${id}`).catch(() => null)
      );
      const results = await Promise.all(promises);
      const valid = results
        .filter((res: any) => res && res.success && res.data)
        .map((res: any) => res.data);
      setBookings(valid);
    } catch (err) {
      Alert.alert('Error', 'Failed to retrieve booking details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookingDetails();
  }, [targetBookingIds.join(',')]);

  const performCancellation = async () => {
    try {
      setSubmitting(true);
      const data = await apiClient.post('/api/v1/bookings/me/cancel-group', {
        bookingIds: targetBookingIds,
        reason: 'Cancelled by customer from mobile app',
      });

      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to cancel bookings.');
      }

      Alert.alert('Cancelled', 'Your booking(s) have been cancelled successfully.');
      fetchBookingDetails();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to cancel bookings.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelBooking = () => {
    const confirmMessage = targetBookingIds.length > 1
      ? `Are you sure you want to cancel all ${targetBookingIds.length} bookings?`
      : 'Are you sure you want to cancel this booking?';

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
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (bookings.length === 0) {
    return (
      <View style={[styles.outerContainer, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={styles.container} style={styles.scrollContainer}>
          <View style={styles.successIconContainer}>
            <View style={[styles.circle, styles.circleCancelled]}>
              <Text style={[styles.checkmark, { color: colors.danger }]}>✕</Text>
            </View>
          </View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Booking Status Unavailable</Text>
          <Text style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: 24, paddingHorizontal: 16 }}>
            Unable to retrieve booking details. Please check your network connection or view your bookings history.
          </Text>

          <TouchableOpacity
            style={[styles.homeBtn, { backgroundColor: colors.primary }]}
            onPress={fetchBookingDetails}
          >
            <Text style={[styles.homeBtnText, { color: colors.primaryForeground }]}>Try Again</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.cancelBtn, { borderColor: colors.border }, { marginTop: 8 }]}
            onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Home' }] })}
          >
            <Text style={[styles.cancelBtnText, { color: colors.textPrimary }]}>Go to Dashboard</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  const allCancelled = bookings.length > 0 && bookings.every((b) => b.status === 'CANCELLED');
  const isCancellable = bookings.some((b) => ['PENDING', 'ASSIGNED'].includes(b.status));

  return (
    <View style={[styles.outerContainer, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.container} style={styles.scrollContainer}>
        <View style={styles.successIconContainer}>
          {allCancelled ? (
            <View style={[styles.circle, styles.circleCancelled]}>
              <Text style={[styles.checkmark, { color: colors.textPrimary }]}>✕</Text>
            </View>
          ) : (
            <View style={[styles.circle, styles.circleSuccess, { borderColor: colors.primary }]}>
              <Text style={[styles.checkmark, { color: colors.primary }]}>✓</Text>
            </View>
          )}
        </View>

        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {allCancelled
            ? bookings.length > 1
              ? 'Bookings Cancelled'
              : 'Booking Cancelled'
            : 'Booking Placed Successfully!'}
        </Text>

        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {bookings.length} {bookings.length === 1 ? 'Service Booked' : 'Services Booked'}
        </Text>

        <View style={[styles.detailsBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          {bookings.map((booking, idx) => (
            <View key={booking.id || idx}>
              {idx > 0 && <View style={[styles.bookingCardDivider, { backgroundColor: colors.border }]} />}

              <Text style={[styles.refLabel, { color: colors.textSecondary }]}>Booking Reference</Text>
              <Text style={[styles.refText, { color: colors.textPrimary }]}>{booking.bookingReference}</Text>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <Text style={[styles.refLabel, { color: colors.textSecondary }]}>Status</Text>
              <Text
                style={[
                  styles.statusText,
                  booking.status === 'CANCELLED' ? styles.textRed : styles.textYellow,
                ]}
              >
                {booking.status}
              </Text>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <Text style={[styles.refLabel, { color: colors.textSecondary }]}>Service</Text>
              <Text style={[styles.valText, { color: colors.textPrimary }]}>{booking.serviceNameSnapshot}</Text>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <Text style={[styles.refLabel, { color: colors.textSecondary }]}>Scheduled For</Text>
              <Text style={[styles.valText, { color: colors.textPrimary }]}>
                {new Date(booking.slotDate).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
                {' • '}
                {booking.slotLabelSnapshot}
              </Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.homeBtn, { backgroundColor: colors.primary }]}
          onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Home' }] })}
        >
          <Text style={[styles.homeBtnText, { color: colors.primaryForeground }]}>Go to Dashboard</Text>
        </TouchableOpacity>

        {isCancellable && (
          <TouchableOpacity
            style={[styles.cancelBtn, { borderColor: colors.danger }, submitting && styles.cancelBtnDisabled]}
            onPress={handleCancelBooking}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={colors.danger} />
            ) : (
              <Text style={[styles.cancelBtnText, { color: colors.danger }]}>
                {bookings.length > 1 ? 'Cancel All Bookings' : 'Cancel Booking'}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  successIconContainer: {
    marginBottom: 20,
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
  },
  circleCancelled: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 2,
    borderColor: '#ef4444',
  },
  checkmark: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 24,
  },
  detailsBox: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    marginBottom: 32,
  },
  bookingCardDivider: {
    height: 2,
    marginVertical: 20,
  },
  refLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  refText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 4,
  },
  statusText: {
    fontSize: 15,
    fontWeight: 'bold',
    marginTop: 4,
  },
  valText: {
    fontSize: 14,
    marginTop: 4,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  textYellow: {
    color: '#d97706',
  },
  textRed: {
    color: '#ef4444',
  },
  homeBtn: {
    width: '100%',
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  homeBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelBtn: {
    backgroundColor: 'transparent',
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
    fontSize: 16,
    fontWeight: 'bold',
  },
});
