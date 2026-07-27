// ─── apps/provider-mobile/src/screens/JobStatusUpdateScreen.tsx ───
// Source: DLD Section 8.1 & 6.4.6 — Job Status Update Screen

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import * as storage from '../utils/storage';

export default function JobStatusUpdateScreen({ navigation, route }: any) {
  const { bookingId } = route.params;
  const token = storage.getAccessToken() || '';
  const baseUrl = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : (Platform.OS === 'web' ? 'http://localhost:3000' : 'http://localhost:3000');

  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [syncState, setSyncState] = useState<'idle' | 'pending' | 'syncing' | 'synced' | 'failed'>('idle');

  const fetchJobDetails = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${baseUrl}/api/v1/providers/me/bookings/${bookingId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setBooking(data.data);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to retrieve job details.');
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

    for (const item of queue) {
      try {
        const res = await fetch(`${baseUrl}/api/v1/providers/me/bookings/${item.bookingId}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'x-client-op-id': item.clientOpId,
          },
          body: JSON.stringify({ status: item.status }),
        });

        const data = await res.json();
        if (res.ok || res.status === 409) {
          updatedQueue = updatedQueue.filter(q => q.clientOpId !== item.clientOpId);
          storage.saveOfflineQueue(updatedQueue);
          if (item.bookingId === bookingId) {
            setBooking((prev: any) => prev ? { ...prev, status: item.status } : null);
          }
        } else {
          item.retryCount += 1;
          storage.saveOfflineQueue(updatedQueue);
        }
      } catch (error) {
        item.retryCount += 1;
        storage.saveOfflineQueue(updatedQueue);
      }
    }

    const remaining = storage.getOfflineQueue();
    if (remaining.length === 0) {
      setSyncState('synced');
    } else {
      setSyncState('failed');
    }
  };

  useEffect(() => {
    fetchJobDetails();
    syncOfflineQueue();

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleOnline = () => {
        syncOfflineQueue();
      };
      window.addEventListener('online', handleOnline);
      return () => {
        window.removeEventListener('online', handleOnline);
      };
    }
  }, [bookingId]);

  const handleUpdateStatus = async (targetStatus: string) => {
    try {
      setSubmitting(true);
      setSyncState('syncing');
      const res = await fetch(`${baseUrl}/api/v1/providers/me/bookings/${bookingId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status: targetStatus }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        if (res.status === 409) {
          setSyncState('synced');
          Alert.alert('Success', `Job status is already ${targetStatus}.`);
          navigation.goBack();
          return;
        }
        throw new Error(data.error?.message || 'Failed to update job status.');
      }

      setSyncState('synced');
      Alert.alert('Success', `Job status updated to ${targetStatus}.`);
      navigation.goBack();
    } catch (err: any) {
      const isNetworkError = err.message === 'Network request failed' ||
                             err.message?.includes('Network') ||
                             err.message?.includes('fetch') ||
                             err.message?.includes('Failed to fetch');

      if (isNetworkError) {
        setSyncState('pending');
        storage.enqueueOfflineUpdate(bookingId, targetStatus);
        Alert.alert('Offline', 'You are currently offline. This update has been queued and will sync automatically when network is restored.');
      } else {
        setSyncState('failed');
        Alert.alert('Error', err.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Job not found.</Text>
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

  // Get status feedback text
  let syncFeedback = '';
  if (syncState === 'pending') syncFeedback = '🕒 Sync Pending (Offline)';
  else if (syncState === 'syncing') syncFeedback = '🔄 Syncing with server...';
  else if (syncState === 'synced') syncFeedback = '✅ Synced with server';
  else if (syncState === 'failed') syncFeedback = '❌ Sync Failed';

  const isActionsDisabled = submitting || syncState === 'syncing';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Update Progress</Text>
        <Text style={styles.subtitle}>Keep the customer updated on your service progress</Text>
      </View>

      {/* Sync State Feedback */}
      {syncFeedback ? (
        <View style={styles.feedbackContainer}>
          <Text style={styles.feedbackText}>{syncFeedback}</Text>
        </View>
      ) : null}

      {/* Progress Cards */}
      <View style={styles.progressCard}>
        <Text style={styles.progressLabel}>Current Status</Text>
        <Text style={styles.statusBadge}>{booking.status}</Text>
      </View>

      {nextStatus ? (
        <View style={styles.actionCard}>
          <Text style={styles.explanationText}>{statusExplanation}</Text>
          <TouchableOpacity
            style={[styles.actionBtn, isActionsDisabled && styles.btnDisabled]}
            onPress={() => handleUpdateStatus(nextStatus)}
            disabled={isActionsDisabled}
          >
            {isActionsDisabled ? <ActivityIndicator size="small" color="#020617" /> : <Text style={styles.actionBtnText}>{buttonText}</Text>}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.completedCard}>
          <Text style={styles.completedText}>🎉 This job has been successfully completed!</Text>
        </View>
      )}

      <TouchableOpacity
        style={styles.cancelBtn}
        onPress={() => navigation.goBack()}
        disabled={isActionsDisabled}
      >
        <Text style={styles.cancelBtnText}>Back to Details</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'hsl(224, 71%, 4%)',
    padding: 24,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: 'hsl(224, 71%, 4%)',
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
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
  },
  progressCard: {
    backgroundColor: 'hsl(222, 47%, 11%)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'hsl(217, 32%, 17%)',
    alignItems: 'center',
    marginBottom: 20,
  },
  progressLabel: {
    fontSize: 12,
    color: '#94a3b8',
    textTransform: 'uppercase',
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  statusBadge: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#10b981',
    marginTop: 6,
  },
  actionCard: {
    backgroundColor: 'rgba(17, 24, 39, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 32,
  },
  explanationText: {
    color: '#cbd5e1',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  actionBtn: {
    backgroundColor: '#10b981',
    width: '100%',
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnDisabled: {
    backgroundColor: '#334155',
    opacity: 0.5,
  },
  actionBtnText: {
    color: '#020617',
    fontSize: 16,
    fontWeight: 'bold',
  },
  completedCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 1,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 32,
  },
  completedText: {
    color: '#10b981',
    fontSize: 15,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  cancelBtn: {
    width: '100%',
    height: 56,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#94a3b8',
    fontSize: 15,
    fontWeight: 'bold',
  },
  errorText: {
    color: '#f87171',
    fontSize: 16,
    textAlign: 'center',
  },
  feedbackContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  feedbackText: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '600',
  },
});
