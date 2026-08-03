import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
} from 'react-native';
import { apiClient } from '../../services/api';

interface RatingSubmissionModalProps {
  visible: boolean;
  onClose: () => void;
  bookingId: string;
  providerName?: string;
  serviceName?: string;
  onSuccess: (ratingData: { ratingScore: number; reviewText: string }) => void;
}

export default function RatingSubmissionModal({
  visible,
  onClose,
  bookingId,
  providerName,
  serviceName,
  onSuccess,
}: RatingSubmissionModalProps) {
  const [ratingScore, setRatingScore] = useState<number>(0);
  const [reviewText, setReviewText] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setRatingScore(0);
      setReviewText('');
      setSubmitting(false);
      setErrorMessage(null);
    }
  }, [visible]);

  const handleSelectStar = (star: number) => {
    setRatingScore(star);
    if (errorMessage) {
      setErrorMessage(null);
    }
  };

  const handleSubmit = async () => {
    if (ratingScore < 1 || ratingScore > 5) {
      setErrorMessage('Please select a star rating (1 to 5 stars).');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage(null);

      const payload = {
        booking_id: bookingId,
        bookingId: bookingId,
        rating: ratingScore,
        ratingScore: ratingScore,
        comment: reviewText.trim() || undefined,
        reviewText: reviewText.trim() || undefined,
      };

      const res = await apiClient.post('/api/v1/ratings', payload);

      if (res.success || res.id || res.rating_id) {
        onSuccess({
          ratingScore,
          reviewText: reviewText.trim(),
        });
        onClose();
      } else {
        throw new Error(res.error?.message || 'Failed to submit rating.');
      }
    } catch (err: any) {
      if (err.status === 409 || err.message?.includes('already')) {
        setErrorMessage('A rating has already been submitted for this booking.');
        setTimeout(() => {
          onSuccess({ ratingScore: ratingScore || 5, reviewText: reviewText.trim() });
          onClose();
        }, 1500);
      } else if (err.status === 403) {
        setErrorMessage('You are not authorized to rate this booking.');
      } else if (err.status === 401) {
        setErrorMessage('Session expired. Please log in again.');
      } else {
        setErrorMessage(err.message || 'Failed to submit rating. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardAvoidingContainer}
          >
            <View style={styles.modalCard}>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerTitleContainer}>
                  <Text style={styles.title}>Rate & Review Service</Text>
                  {serviceName ? (
                    <Text style={styles.subtitle}>{serviceName}</Text>
                  ) : null}
                  {providerName ? (
                    <Text style={styles.providerText}>Provider: {providerName}</Text>
                  ) : null}
                </View>
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeButton}
                  accessibilityLabel="Close rating modal"
                  accessibilityRole="button"
                >
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                bounces={false}
              >
                <Text style={styles.questionText}>
                  How was your service experience?
                </Text>

                {/* 1-5 Star Picker */}
                <View style={styles.starRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                      key={star}
                      onPress={() => handleSelectStar(star)}
                      style={styles.starButton}
                      accessibilityLabel={`Rate ${star} star${star > 1 ? 's' : ''}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected: star <= ratingScore }}
                    >
                      <Text
                        style={[
                          styles.starText,
                          { color: star <= ratingScore ? '#f59e0b' : '#4b5563' },
                        ]}
                      >
                        ★
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {ratingScore > 0 ? (
                  <Text style={styles.ratingScoreLabel}>
                    Selected: {ratingScore} of 5 Stars
                  </Text>
                ) : (
                  <Text style={styles.ratingScoreHint}>
                    Tap a star above to rate
                  </Text>
                )}

                {/* Feedback Input with Live Character Counter */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>
                    Written Review (Optional)
                  </Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Write feedback for the service provider (max 500 chars)..."
                    placeholderTextColor="#6b7280"
                    multiline
                    numberOfLines={3}
                    maxLength={500}
                    value={reviewText}
                    onChangeText={setReviewText}
                    editable={!submitting}
                  />
                  <Text
                    style={[
                      styles.counterText,
                      reviewText.length === 500 && styles.counterTextFull,
                    ]}
                  >
                    {reviewText.length} / 500
                  </Text>
                </View>

                {errorMessage ? (
                  <View style={styles.errorBanner}>
                    <Text style={styles.errorBannerText}>{errorMessage}</Text>
                  </View>
                ) : null}

                {/* Submit Button */}
                <TouchableOpacity
                  style={[
                    styles.submitBtn,
                    (ratingScore === 0 || submitting) && styles.submitBtnDisabled,
                  ]}
                  onPress={handleSubmit}
                  disabled={ratingScore === 0 || submitting}
                  accessibilityLabel="Submit Rating"
                  accessibilityRole="button"
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text
                      style={[
                        styles.submitBtnText,
                        (ratingScore === 0 || submitting) && styles.submitBtnTextDisabled,
                      ]}
                    >
                      Submit Rating & Review
                    </Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  keyboardAvoidingContainer: {
    width: '100%',
  },
  modalCard: {
    backgroundColor: '#1f2937', // Sleek Dark theme background
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '92%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
    paddingBottom: 10,
  },
  headerTitleContainer: {
    flex: 1,
    marginRight: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f9fafb',
  },
  subtitle: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 2,
  },
  providerText: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 2,
  },
  closeButton: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: '#374151',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9ca3af',
  },
  scrollContent: {
    paddingTop: 12,
    paddingBottom: 8,
  },
  questionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#e5e7eb',
    textAlign: 'center',
    marginBottom: 8,
  },
  starRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  starButton: {
    padding: 4,
  },
  starText: {
    fontSize: 36,
  },
  ratingScoreLabel: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
    color: '#fbbf24',
    marginBottom: 10,
  },
  ratingScoreHint: {
    textAlign: 'center',
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 10,
  },
  inputContainer: {
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#e5e7eb',
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#4b5563',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#f9fafb',
    textAlignVertical: 'top',
    minHeight: 75,
    backgroundColor: '#111827',
  },
  counterText: {
    textAlign: 'right',
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  counterTextFull: {
    color: '#f87171',
    fontWeight: '700',
  },
  errorBanner: {
    backgroundColor: '#451a1a',
    borderColor: '#991b1b',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  errorBannerText: {
    color: '#fca5a5',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  submitBtn: {
    backgroundColor: 'hsl(150, 84%, 40%)',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  submitBtnDisabled: {
    backgroundColor: '#374151',
    opacity: 0.7,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  submitBtnTextDisabled: {
    color: '#9ca3af',
  },
});
