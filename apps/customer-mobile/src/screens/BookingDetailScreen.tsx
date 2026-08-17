import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  SafeAreaView,
  Platform,
  TextInput,
} from 'react-native';
import * as storage from '../utils/storage';
import { apiClient } from '../services/api';
import RatingSubmissionModal from './rating/RatingSubmissionModal';
import { useTheme } from '../theme/ThemeContext';

export default function BookingDetailScreen({ navigation, route }: any) {
  const { colors } = useTheme();
  const { bookingId } = route.params;

  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Rating & Review State
  const [ratingScore, setRatingScore] = useState<number>(0);
  const [reviewText, setReviewText] = useState<string>('');
  const [ratingSubmitted, setRatingSubmitted] = useState<boolean>(false);
  const [isRatingModalVisible, setIsRatingModalVisible] = useState<boolean>(false);

  const fetchBookingDetails = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get(`/api/v1/bookings/${bookingId}`);
      if (data.success) {
        setBooking(data.data);
        if (data.data.status === 'COMPLETED') {
          fetchRatingDetails();
        }
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to retrieve booking details.');
    } finally {
      setLoading(false);
    }
  };

  const fetchRatingDetails = async () => {
    try {
      const data = await apiClient.get(`/api/v1/ratings/booking/${bookingId}`);
      if (data.success && data.data) {
        setRatingScore(data.data.rating_score || data.data.rating || 0);
        setReviewText(data.data.review_text || data.data.comment || '');
        setRatingSubmitted(true);
        storage.setItem(
          `rating_${bookingId}`,
          JSON.stringify({
            ratingScore: data.data.rating_score || data.data.rating || 0,
            reviewText: data.data.review_text || data.data.comment || '',
          })
        );
      } else {
        // Fallback to local storage if API didn't return rating
        const savedRatingStr = storage.getItem(`rating_${bookingId}`);
        if (savedRatingStr) {
          const savedRating = JSON.parse(savedRatingStr);
          if (savedRating.ratingScore) setRatingScore(savedRating.ratingScore);
          if (savedRating.reviewText) setReviewText(savedRating.reviewText);
          setRatingSubmitted(true);
        }
      }
    } catch (err) {
      // Fallback to local storage
      const savedRatingStr = storage.getItem(`rating_${bookingId}`);
      if (savedRatingStr) {
        try {
          const savedRating = JSON.parse(savedRatingStr);
          if (savedRating.ratingScore) setRatingScore(savedRating.ratingScore);
          if (savedRating.reviewText) setReviewText(savedRating.reviewText);
          setRatingSubmitted(true);
        } catch (e) {
          // Ignore parse error
        }
      }
    }
  };

  useEffect(() => {
    fetchBookingDetails();
  }, [bookingId]);

  const handleRatingSuccess = (ratingData: { ratingScore: number; reviewText: string }) => {
    setRatingScore(ratingData.ratingScore);
    setReviewText(ratingData.reviewText);
    setRatingSubmitted(true);
    storage.setItem(
      `rating_${bookingId}`,
      JSON.stringify(ratingData)
    );
    // Navigate back to MyBookings with toast
    navigation.navigate('MyBookings', {
      toastMessage: 'Thank you! Your rating and review have been submitted successfully.',
    });
  };

  const performCancellation = async () => {
    try {
      setSubmitting(true);
      const data = await apiClient.patch(`/api/v1/bookings/me/${bookingId}/cancel`, {
        reason: 'Cancelled by customer from details screen',
      });

      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to cancel booking.');
      }

      // Navigate back to MyBookingsScreen and show the toast
      navigation.navigate('MyBookings', { toastMessage: 'Booking cancelled.' });
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelBooking = () => {
    const confirmMessage = 'Cancel this booking? This action cannot be undone.';
    
    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof (window as any).confirm === 'function') {
      if ((window as any).confirm(confirmMessage)) {
        performCancellation();
      }
    } else {
      Alert.alert(
        'Cancel Booking',
        confirmMessage,
        [
          { text: 'No', style: 'cancel' },
          { text: 'Yes, Cancel', style: 'destructive', onPress: performCancellation },
        ]
      );
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!booking) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>Booking details not found.</Text>
      </SafeAreaView>
    );
  }

  const isCancellable = ['PENDING', 'ASSIGNED'].includes(booking.status);
  const isCompleted = booking.status === 'COMPLETED';
  const formattedDate = new Date(booking.slotDate).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Booking Reference</Text>
          <Text style={[styles.referenceText, { color: colors.textPrimary }]}>{booking.bookingReference}</Text>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Status</Text>
          <Text
            style={[
              styles.statusText,
              booking.status === 'CANCELLED'
                ? styles.textGrey
                : booking.status === 'COMPLETED'
                ? styles.textGreen
                : styles.textYellow,
            ]}
          >
            {booking.status}
          </Text>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Service Details</Text>
          <Text style={[styles.valueText, { color: colors.textPrimary }]}>{booking.serviceNameSnapshot}</Text>
          <Text style={[styles.priceText, { color: colors.primary }]}>
            Price: ₹{parseFloat(booking.servicePriceSnapshot).toLocaleString('en-IN')}
          </Text>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Schedule</Text>
          <Text style={[styles.valueText, { color: colors.textPrimary }]}>
            {formattedDate} • {booking.slotLabelSnapshot}
          </Text>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Address</Text>
          <Text style={[styles.valueText, { color: colors.textPrimary }]}>{booking.addressSnapshot?.label}</Text>
          <Text style={[styles.subValueText, { color: colors.textSecondary }]}>{booking.addressSnapshot?.addressLine1}</Text>
          <Text style={[styles.subValueText, { color: colors.textMuted }]}>
            {booking.addressSnapshot?.city} - {booking.addressSnapshot?.pincode}
          </Text>
        </View>

        {isCompleted && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Rate & Review Service</Text>
            {ratingSubmitted ? (
              <View style={styles.ratingSuccessContainer}>
                <View style={styles.starRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Text key={star} style={[styles.starText, { color: star <= ratingScore ? '#f59e0b' : colors.textMuted }]}>
                      ★
                    </Text>
                  ))}
                </View>
                {reviewText ? <Text style={[styles.reviewSubmittedText, { color: colors.textPrimary }]}>"{reviewText}"</Text> : null}
                <Text style={[styles.submittedBadge, { color: colors.primary }]}>✓ Rating & Review Submitted</Text>
              </View>
            ) : (
              <View style={styles.ratingForm}>
                <Text style={[styles.ratingSubLabel, { color: colors.textSecondary }]}>Your feedback helps us improve provider service quality.</Text>
                <TouchableOpacity
                  style={[styles.submitRatingBtn, { backgroundColor: colors.primary }]}
                  onPress={() => setIsRatingModalVisible(true)}
                  accessibilityLabel="Rate and Review Service"
                  accessibilityRole="button"
                >
                  <Text style={[styles.submitRatingBtnText, { color: colors.primaryForeground }]}>★ Rate & Review Service</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        <RatingSubmissionModal
          visible={isRatingModalVisible}
          onClose={() => setIsRatingModalVisible(false)}
          bookingId={booking.id}
          serviceName={booking.serviceNameSnapshot}
          onSuccess={handleRatingSuccess}
        />

        {isCancellable && (
          <TouchableOpacity
            style={[styles.cancelBtn, { borderColor: colors.danger }, submitting && styles.cancelBtnDisabled]}
            onPress={handleCancelBooking}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={colors.danger} />
            ) : (
              <Text style={[styles.cancelBtnText, { color: colors.danger }]}>Cancel Booking</Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
  },
  card: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  referenceText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 4,
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 4,
  },
  valueText: {
    fontSize: 15,
    marginTop: 4,
    fontWeight: '500',
  },
  subValueText: {
    fontSize: 14,
    marginTop: 2,
  },
  priceText: {
    fontSize: 14,
    marginTop: 2,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },
  textYellow: {
    color: '#d97706',
  },
  textGreen: {
    color: '#059669',
  },
  textGrey: {
    color: '#6b7280',
  },
  cancelBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
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
  ratingForm: {
    marginTop: 12,
  },
  ratingSubLabel: {
    fontSize: 13,
    marginBottom: 12,
  },
  starPickerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  starTouch: {
    paddingHorizontal: 8,
  },
  starPickerText: {
    fontSize: 32,
  },
  reviewInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    textAlignVertical: 'top',
    minHeight: 80,
    marginBottom: 16,
  },
  submitRatingBtn: {
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitRatingBtnText: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  ratingSuccessContainer: {
    marginTop: 12,
    alignItems: 'center',
  },
  starRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  starText: {
    fontSize: 26,
    marginHorizontal: 2,
  },
  reviewSubmittedText: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 4,
  },
  submittedBadge: {
    fontSize: 13,
    fontWeight: 'bold',
    marginTop: 8,
  },
});


