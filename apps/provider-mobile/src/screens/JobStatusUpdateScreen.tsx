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

  const fetchJobDetails = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${baseUrl}/api/v1/provider/bookings/${bookingId}`, {
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

  useEffect(() => {
    fetchJobDetails();
  }, [bookingId]);

  const handleUpdateStatus = async (targetStatus: string) => {
    try {
      setSubmitting(true);
      const res = await fetch(`${baseUrl}/api/v1/provider/bookings/${bookingId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status: targetStatus }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to update job status.');
      }

      Alert.alert('Success', `Job status updated to ${targetStatus}.`);
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Error', err.message);
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

  // Determine next status and button text
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Update Progress</Text>
        <Text style={styles.subtitle}>Keep the customer updated on your service progress</Text>
      </View>

      {/* Progress Cards */}
      <View style={styles.progressCard}>
        <Text style={styles.progressLabel}>Current Status</Text>
        <Text style={styles.statusBadge}>{booking.status}</Text>
      </View>

      {nextStatus ? (
        <View style={styles.actionCard}>
          <Text style={styles.explanationText}>{statusExplanation}</Text>
          <TouchableOpacity
            style={[styles.actionBtn, submitting && styles.btnDisabled]}
            onPress={() => handleUpdateStatus(nextStatus)}
            disabled={submitting}
          >
            {submitting ? <ActivityIndicator size="small" color="#020617" /> : <Text style={styles.actionBtnText}>{buttonText}</Text>}
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
    height: 52,
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
    height: 52,
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
});
