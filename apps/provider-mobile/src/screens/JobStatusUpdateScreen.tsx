// ─── apps/provider-mobile/src/screens/JobStatusUpdateScreen.tsx ───
// Source: DLD Section 8.1 & 6.4.6 — Job Status Update Screen

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Clock, RefreshCw, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react-native';
import * as storage from '../utils/storage';
import { apiClient } from '../services/api';
import { ToastContainer, ToastItem, ToastType } from '../components/ToastContainer';
import { useProviderTheme } from '../context/ProviderThemeContext';

export default function JobStatusUpdateScreen({ navigation, route }: any) {
  const { colors } = useProviderTheme();
  const { bookingId } = route.params;

  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [syncState, setSyncState] = useState<'idle' | 'pending' | 'syncing' | 'synced' | 'failed'>('idle');

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
      const data = await apiClient.get(`/api/v1/providers/me/bookings/${bookingId}`);
      if (data.success) {
        setBooking(data.data);
      }
    } catch (err) {
      showToast('Failed to retrieve job details.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const syncOfflineQueue = async () => {
    const queue = storage.getOfflineQueue();
    if (queue.length === 0) return;

    setSyncState('syncing');
    let updatedQueue = [...queue];
    updatedQueue.sort((a, b) => a.timestamp - b.timestamp);

    for (const item of updatedQueue) {
      try {
        const res = await apiClient.raw(`/api/v1/providers/me/bookings/${item.bookingId}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status: item.status }),
        });
        if (res.ok || res.status === 409) {
          storage.removeOfflineUpdate(item.clientOpId);
        }
      } catch (err) {
        console.error('Failed to sync offline item:', item.clientOpId, err);
      }
    }
    setSyncState('synced');
    fetchJobDetails();
  };

  useEffect(() => {
    fetchJobDetails();
    syncOfflineQueue();
  }, [bookingId]);

  const handleUpdateStatus = async (targetStatus: string) => {
    try {
      setSubmitting(true);
      setSyncState('syncing');
      const data = await apiClient.patch(`/api/v1/providers/me/bookings/${bookingId}/status`, {
        status: targetStatus,
      });

      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to update job status.');
      }

      setSyncState('synced');
      showToast(`Job status updated to ${targetStatus}.`, 'success');
      setTimeout(() => navigation.goBack(), 1000);
    } catch (err: any) {
      if (err.status === 409) {
        setSyncState('synced');
        showToast(`Job status is already ${targetStatus}.`, 'info');
        setTimeout(() => navigation.goBack(), 1000);
        return;
      }

      const isNetworkError = err.message === 'Network request failed' ||
                             err.message?.includes('Network') ||
                             err.message?.includes('fetch') ||
                             err.message?.includes('Failed to fetch');

      if (isNetworkError) {
        setSyncState('pending');
        storage.enqueueOfflineUpdate(bookingId, targetStatus);
        showToast('You are currently offline. This update has been queued and will sync automatically.', 'warning');
      } else {
        setSyncState('failed');
        showToast(err.message || 'Failed to update status.', 'error');
      }
    } finally {
      setSubmitting(false);
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
        <Text style={[styles.errorText, { color: colors.danger }]}>Job not found.</Text>
      </View>
    );
  }

  let nextStatus = '';
  let buttonText = '';
  let statusExplanation = '';

  if (booking.status === 'ACCEPTED') {
    nextStatus = 'ON_THE_WAY';
    buttonText = 'Mark as On the Way';
    statusExplanation = 'Confirm you are leaving for the customer address.';
  } else if (booking.status === 'ON_THE_WAY') {
    nextStatus = 'STARTED';
    buttonText = 'Start Job';
    statusExplanation = 'Confirm you have reached and are beginning the service.';
  } else if (booking.status === 'STARTED') {
    nextStatus = 'COMPLETED';
    buttonText = 'Complete Job';
    statusExplanation = 'Confirm the service is fully completed and payment is due.';
  }

  // Get status feedback icon and text
  const renderSyncFeedback = () => {
    if (syncState === 'pending') {
      return (
        <View style={styles.feedbackRow}>
          <Clock size={16} color={colors.warning} style={{ marginRight: 6 }} />
          <Text style={[styles.feedbackText, { color: colors.textPrimary }]}>Sync Pending (Offline)</Text>
        </View>
      );
    } else if (syncState === 'syncing') {
      return (
        <View style={styles.feedbackRow}>
          <RefreshCw size={16} color={colors.info} style={{ marginRight: 6 }} />
          <Text style={[styles.feedbackText, { color: colors.textPrimary }]}>Syncing with server...</Text>
        </View>
      );
    } else if (syncState === 'synced') {
      return (
        <View style={styles.feedbackRow}>
          <CheckCircle2 size={16} color={colors.primary} style={{ marginRight: 6 }} />
          <Text style={[styles.feedbackText, { color: colors.textPrimary }]}>Synced with server</Text>
        </View>
      );
    } else if (syncState === 'failed') {
      return (
        <View style={styles.feedbackRow}>
          <AlertCircle size={16} color={colors.danger} style={{ marginRight: 6 }} />
          <Text style={[styles.feedbackText, { color: colors.textPrimary }]}>Sync Failed</Text>
        </View>
      );
    }
    return null;
  };

  const isActionsDisabled = submitting || syncState === 'syncing';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Update Progress</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Keep the customer updated on your service progress</Text>
      </View>

      {/* Sync State Feedback */}
      {syncState !== 'idle' ? (
        <View style={[styles.feedbackContainer, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
          {renderSyncFeedback()}
        </View>
      ) : null}

      {/* Progress Cards */}
      <View style={[styles.progressCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.progressLabel, { color: colors.textMuted }]}>Current Status</Text>
        <Text style={[styles.statusBadge, { color: colors.primary }]}>{booking.status}</Text>
      </View>

      {nextStatus ? (
        <View style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.explanationText, { color: colors.textSecondary }]}>{statusExplanation}</Text>
          <TouchableOpacity
            style={[
              styles.actionBtn,
              { backgroundColor: colors.primary },
              isActionsDisabled && { backgroundColor: colors.surfaceSecondary, opacity: 0.6 },
            ]}
            onPress={() => handleUpdateStatus(nextStatus)}
            disabled={isActionsDisabled}
          >
            {isActionsDisabled ? <ActivityIndicator size="small" color={colors.primaryForeground} /> : <Text style={[styles.actionBtnText, { color: colors.primaryForeground }]}>{buttonText}</Text>}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[styles.completedCard, { backgroundColor: colors.statusAcceptedBg, borderColor: colors.primary }]}>
          <View style={styles.completedRow}>
            <Sparkles size={20} color={colors.primary} style={{ marginRight: 8 }} />
            <Text style={[styles.completedText, { color: colors.primary }]}>This job has been successfully completed!</Text>
          </View>
        </View>
      )}

      <TouchableOpacity
        style={[styles.cancelBtn, { borderColor: colors.border }]}
        onPress={() => navigation.goBack()}
        disabled={isActionsDisabled}
      >
        <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Back to Details</Text>
      </TouchableOpacity>
      <ToastContainer toastQueue={toastQueue} onDismiss={dismissToast} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: 32,
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
  progressCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  progressLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  statusBadge: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 6,
  },
  actionCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  explanationText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  actionBtn: {
    width: '100%',
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  completedCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 32,
  },
  completedText: {
    fontSize: 15,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  cancelBtn: {
    width: '100%',
    height: 56,
    borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
  },
  completedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackContainer: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 1,
  },
  feedbackText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

