import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Platform,
} from 'react-native';
import { CheckCircle, XCircle, MapPin } from 'lucide-react-native';
import * as storage from '../utils/storage';
import { apiClient } from '../services/api';
import { ToastContainer, ToastItem, ToastType } from '../components/ToastContainer';
import { useProviderTheme } from '../context/ProviderThemeContext';

export default function ProviderJobDetailScreen({ navigation, route }: any) {
  const { colors } = useProviderTheme();
  const { bookingId } = route.params;

  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [rejecting, setRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Toast Queue state
  const [toastQueue, setToastQueue] = useState<ToastItem[]>([]);
  const showToast = (message: string, type: ToastType = 'success') => {
    setToastQueue((prev) => [...prev, { id: `${Date.now()}-${Math.random()}`, message, type }]);
  };
  const dismissToast = (id: string) => {
    setToastQueue((prev) => prev.filter((t) => t.id !== id));
  };

  const fetchJobDetails = async () => {
    try {
      setLoading(true);
      let data: any = null;
      try {
        data = await apiClient.get(`/api/v1/providers/me/bookings/${bookingId}`);
      } catch (e) {
        try {
          const activeList = await apiClient.get('/api/v1/providers/me/bookings?page=1&limit=50');
          if (activeList.success && Array.isArray(activeList.data)) {
            const match = activeList.data.find(
              (b: any) =>
                b.id === bookingId ||
                b.bookingReference === bookingId ||
                `ACM-${b.bookingReference}` === bookingId ||
                (bookingId && bookingId.includes(b.bookingReference))
            );
            if (match) {
              data = { success: true, data: match };
            }
          }
        } catch (fallbackErr) {
          // ignore fallback search errors
        }
      }

      if (data?.success) {
        setBooking(data.data);
      } else {
        setBooking(null);
      }
    } catch (err) {
      showToast('Failed to retrieve job details.', 'error');
      setBooking(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobDetails();
  }, [bookingId]);

  const handleAcceptJob = async () => {
    try {
      setSubmitting(true);
      const data = await apiClient.patch(`/api/v1/providers/me/bookings/${bookingId}/accept`, {});

      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to accept job.');
      }

      showToast('You have accepted the job.', 'success');
      fetchJobDetails();
    } catch (err: any) {
      showToast(err.message || 'Failed to accept job.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectJob = async () => {
    try {
      setSubmitting(true);
      const data = await apiClient.patch(`/api/v1/providers/me/bookings/${bookingId}/reject`, {
        reason: rejectionReason.trim() || 'Provider rejected job assignment',
      });

      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to reject job.');
      }

      showToast('You have rejected this job assignment.', 'success');
      setTimeout(() => navigation.goBack(), 1000);
    } catch (err: any) {
      showToast(err.message || 'Failed to reject job.', 'error');
    } finally {
      setSubmitting(false);
      setRejecting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.danger }]}>Job not found or access denied.</Text>
      </View>
    );
  }

  // Get status color from theme
  let statusColor = colors.textPrimary;
  if (booking.status === 'ASSIGNED') statusColor = colors.statusAssignedText;
  else if (booking.status === 'ACCEPTED') statusColor = colors.statusAcceptedText;
  else if (booking.status === 'ON_THE_WAY') statusColor = colors.statusOnTheWayText;
  else if (booking.status === 'STARTED') statusColor = colors.statusStartedText;
  else if (booking.status === 'COMPLETED') statusColor = colors.statusCompletedText;

  return (
    <View style={[styles.outerContainer, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Job Details</Text>
        <Text style={[styles.refText, { color: colors.textMuted }]}>ACM-{booking.bookingReference}</Text>
      </View>

      {/* Details Card */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.detailRow, { borderBottomColor: colors.borderSubtle }]}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Service</Text>
          <Text style={[styles.value, { color: colors.textPrimary }]}>{booking.serviceNameSnapshot}</Text>
        </View>

        <View style={[styles.detailRow, { borderBottomColor: colors.borderSubtle }]}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Scheduled Date</Text>
          <Text style={[styles.value, { color: colors.textPrimary }]}>
            {new Date(booking.slotDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
          </Text>
        </View>

        <View style={[styles.detailRow, { borderBottomColor: colors.borderSubtle }]}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Time Slot</Text>
          <Text style={[styles.value, { color: colors.textPrimary }]}>{booking.slotLabelSnapshot}</Text>
        </View>

        <View style={[styles.detailRow, { borderBottomColor: colors.borderSubtle }]}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Status</Text>
          <Text style={[styles.value, { color: statusColor, fontWeight: 'bold' }]}>{booking.status}</Text>
        </View>
      </View>

      {/* Address Card */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.addressHeaderRow}>
          <MapPin size={16} color={colors.textMuted} style={{ marginRight: 6 }} />
          <Text style={[styles.cardSectionTitle, { color: colors.textMuted }]}>Customer Address</Text>
        </View>
        <Text style={[styles.addressLabel, { color: colors.textPrimary }]}>{booking.addressSnapshot?.label}</Text>
        <Text style={[styles.addressText, { color: colors.textSecondary }]}>{booking.addressSnapshot?.addressLine1}</Text>
        {booking.addressSnapshot?.addressLine2 && <Text style={[styles.addressText, { color: colors.textSecondary }]}>{booking.addressSnapshot.addressLine2}</Text>}
        <Text style={[styles.addressText, { color: colors.textSecondary }]}>{booking.addressSnapshot?.city} - {booking.addressSnapshot?.pincode}</Text>
      </View>

      {/* Actions */}
      {booking.status === 'ASSIGNED' ? (
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.btnAccept, { backgroundColor: colors.primary }]}
            onPress={handleAcceptJob}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={colors.primaryForeground} />
            ) : (
              <View style={styles.btnRow}>
                <CheckCircle size={18} color={colors.primaryForeground} style={{ marginRight: 6 }} />
                <Text style={[styles.btnAcceptText, { color: colors.primaryForeground }]}>Accept Job</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.btnReject, { borderColor: colors.danger }]}
            onPress={() => setRejecting(true)}
            disabled={submitting}
          >
            <View style={styles.btnRow}>
              <XCircle size={18} color={colors.danger} style={{ marginRight: 6 }} />
              <Text style={[styles.btnRejectText, { color: colors.danger }]}>Reject Job</Text>
            </View>
          </TouchableOpacity>
        </View>
      ) : ['ACCEPTED', 'ON_THE_WAY', 'STARTED'].includes(booking.status) ? (
        <TouchableOpacity
          style={[styles.actionBtn, styles.btnUpdateStatus, { backgroundColor: colors.primary }]}
          onPress={() => navigation.navigate('JobStatusUpdate', { bookingId })}
        >
          <Text style={[styles.btnUpdateStatusText, { color: colors.primaryForeground }]}>Update Job Status</Text>
        </TouchableOpacity>
      ) : null}

      <TouchableOpacity
        style={[styles.backBtn, { borderColor: colors.border }]}
        onPress={() => navigation.goBack()}
      >
        <Text style={[styles.backBtnText, { color: colors.textSecondary }]}>Back to Dashboard</Text>
      </TouchableOpacity>
      </ScrollView>

      {/* REJECTION CONFIRMATION MODAL */}
      {rejecting && (
        <View style={[styles.modalOverlay, { backgroundColor: colors.backdrop }]}>
          <View style={[styles.modalContainer, { backgroundColor: colors.modalSurface, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Reject this job? It will be reassigned.</Text>
            <Text style={[styles.modalSubTitle, { color: colors.textSecondary }]}>
              This action will unassign you from this job and return it to the dispatch queue for admin reassignment.
            </Text>

            <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Rejection Reason (Optional)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.inputText }]}
              placeholder="Provide a reason for rejection..."
              placeholderTextColor={colors.inputPlaceholder}
              value={rejectionReason}
              onChangeText={setRejectionReason}
              multiline
              numberOfLines={3}
            />

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.btnCancel, { borderColor: colors.border }]}
                onPress={() => {
                  setRejecting(false);
                  setRejectionReason('');
                }}
                disabled={submitting}
              >
                <Text style={[styles.btnCancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.btnRejectSubmit, { backgroundColor: colors.danger }]}
                onPress={handleRejectJob}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.btnRejectSubmitText}>Confirm Rejection</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <ToastContainer toastQueue={toastQueue} onDismiss={dismissToast} />
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
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
  },
  refText: {
    fontSize: 14,
    marginTop: 4,
    fontWeight: '600',
  },
  card: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  label: {
    fontSize: 14,
  },
  value: {
    fontSize: 14,
    fontWeight: '500',
  },
  addressHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardSectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  addressText: {
    fontSize: 14,
    lineHeight: 20,
  },
  actionContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginBottom: 16,
  },
  actionBtn: {
    flex: 1,
    height: 56,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnAccept: {},
  btnAcceptText: {
    fontWeight: 'bold',
    fontSize: 15,
  },
  btnReject: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
  },
  btnRejectText: {
    fontWeight: 'bold',
    fontSize: 15,
  },
  btnUpdateStatus: {
    width: '100%',
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  btnUpdateStatusText: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  backBtn: {
    width: '100%',
    height: 56,
    borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 48,
  },
  backBtnText: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
  rejectForm: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  btnCancel: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  btnCancelText: {
    fontWeight: 'bold',
  },
  btnRejectSubmit: {},
  btnRejectSubmitText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 999,
  },
  modalContainer: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  modalSubTitle: {
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 18,
  },
});

