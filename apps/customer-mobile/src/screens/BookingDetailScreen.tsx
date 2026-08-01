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

export default function BookingDetailScreen({ navigation, route }: any) {
  const { bookingId } = route.params;

  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Rating & Review State
  const [ratingScore, setRatingScore] = useState<number>(5);
  const [reviewText, setReviewText] = useState<string>('');
  const [ratingSubmitted, setRatingSubmitted] = useState<boolean>(false);
  const [submittingRating, setSubmittingRating] = useState<boolean>(false);

  const fetchBookingDetails = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get(`/api/v1/bookings/${bookingId}`);
      if (data.success) {
        setBooking(data.data);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to retrieve booking details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookingDetails();
  }, [bookingId]);

  const handleRatingSubmit = async () => {
    if (!booking) return;
    try {
      setSubmittingRating(true);
      const data = await apiClient.post('/api/v1/ratings', {
        bookingId: booking.id,
        ratingScore,
        reviewText: reviewText.trim() || undefined,
      });

      if (data.success) {
        setRatingSubmitted(true);
        Alert.alert('Thank You!', 'Your rating and review have been submitted successfully.');
      } else {
        throw new Error(data.error?.message || 'Failed to submit rating.');
      }
    } catch (err: any) {
      if (err.status === 409 || err.message?.includes('already')) {
        setRatingSubmitted(true);
        Alert.alert('Notice', 'A rating has already been submitted for this booking.');
      } else {
        Alert.alert('Error', err.message || 'Failed to submit rating.');
      }
    } finally {
      setSubmittingRating(false);
    }
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
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="hsl(150, 84%, 40%)" />
      </SafeAreaView>
    );
  }

  if (!booking) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.errorText}>Booking details not found.</Text>
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
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Booking Reference</Text>
          <Text style={styles.referenceText}>{booking.bookingReference}</Text>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Status</Text>
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

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Service Details</Text>
          <Text style={styles.valueText}>{booking.serviceNameSnapshot}</Text>
          <Text style={styles.priceText}>
            Price: ₹{parseFloat(booking.servicePriceSnapshot).toLocaleString('en-IN')}
          </Text>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Schedule</Text>
          <Text style={styles.valueText}>
            {formattedDate} • {booking.slotLabelSnapshot}
          </Text>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Address</Text>
          <Text style={styles.valueText}>{booking.addressSnapshot?.label}</Text>
          <Text style={styles.subValueText}>{booking.addressSnapshot?.addressLine1}</Text>
          <Text style={styles.subValueText}>
            {booking.addressSnapshot?.city} - {booking.addressSnapshot?.pincode}
          </Text>
        </View>

        {isCompleted && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Rate & Review Service</Text>
            {ratingSubmitted ? (
              <View style={styles.ratingSuccessContainer}>
                <View style={styles.starRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Text key={star} style={[styles.starText, { color: star <= ratingScore ? '#f59e0b' : '#4b5563' }]}>
                      ★
                    </Text>
                  ))}
                </View>
                {reviewText ? <Text style={styles.reviewSubmittedText}>"{reviewText}"</Text> : null}
                <Text style={styles.submittedBadge}>✓ Rating & Review Submitted</Text>
              </View>
            ) : (
              <View style={styles.ratingForm}>
                <Text style={styles.ratingSubLabel}>How was your service experience?</Text>
                <View style={styles.starPickerRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity key={star} onPress={() => setRatingScore(star)} style={styles.starTouch}>
                      <Text style={[styles.starPickerText, { color: star <= ratingScore ? '#f59e0b' : '#4b5563' }]}>
                        ★
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TextInput
                  style={styles.reviewInput}
                  placeholder="Write feedback for the service provider (optional)..."
                  placeholderTextColor="#6b7280"
                  multiline
                  numberOfLines={3}
                  value={reviewText}
                  onChangeText={setReviewText}
                />

                <TouchableOpacity
                  style={[styles.submitRatingBtn, submittingRating && styles.btnDisabled]}
                  onPress={handleRatingSubmit}
                  disabled={submittingRating}
                >
                  {submittingRating ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.submitRatingBtnText}>Submit Rating & Review</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {isCancellable && (
          <TouchableOpacity
            style={[styles.cancelBtn, submitting && styles.cancelBtnDisabled]}
            onPress={handleCancelBooking}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="hsl(350, 80%, 60%)" />
            ) : (
              <Text style={styles.cancelBtnText}>Cancel Booking</Text>
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
    backgroundColor: 'hsl(224, 71%, 4%)',
  },
  container: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: 'hsl(224, 71%, 4%)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: 'hsl(215, 20%, 65%)',
    fontSize: 16,
  },
  card: {
    backgroundColor: 'hsl(222, 47%, 11%)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'hsl(217, 32%, 17%)',
  },
  sectionTitle: {
    fontSize: 11,
    color: 'hsl(215, 20%, 65%)',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  referenceText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'hsl(210, 40%, 98%)',
    marginTop: 4,
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 4,
  },
  valueText: {
    fontSize: 15,
    color: 'hsl(210, 40%, 98%)',
    marginTop: 4,
    fontWeight: '500',
  },
  subValueText: {
    fontSize: 14,
    color: 'hsl(215, 20%, 65%)',
    marginTop: 2,
  },
  priceText: {
    fontSize: 14,
    color: 'hsl(150, 84%, 45%)',
    marginTop: 2,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: 'hsl(217, 32%, 17%)',
    marginVertical: 16,
  },
  textYellow: {
    color: '#fbbf24',
  },
  textGreen: {
    color: '#34d399',
  },
  textGrey: {
    color: '#9ca3af',
  },
  cancelBtn: {
    backgroundColor: 'transparent',
    borderColor: 'hsl(350, 80%, 60%)',
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
    color: 'hsl(350, 80%, 60%)',
    fontSize: 16,
    fontWeight: 'bold',
  },
  ratingForm: {
    marginTop: 12,
  },
  ratingSubLabel: {
    color: 'hsl(215, 20%, 65%)',
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
    backgroundColor: 'hsl(224, 71%, 4%)',
    borderWidth: 1,
    borderColor: 'hsl(217, 32%, 17%)',
    borderRadius: 12,
    padding: 12,
    color: '#f9fafb',
    fontSize: 14,
    textAlignVertical: 'top',
    minHeight: 80,
    marginBottom: 16,
  },
  submitRatingBtn: {
    backgroundColor: 'hsl(150, 84%, 40%)',
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitRatingBtnText: {
    color: '#ffffff',
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
    color: 'hsl(210, 40%, 98%)',
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 4,
  },
  submittedBadge: {
    color: '#34d399',
    fontSize: 13,
    fontWeight: 'bold',
    marginTop: 8,
  },
});

