// ─── apps/provider-mobile/src/screens/ProviderJobDetailScreen.tsx ───
// Source: DLD Section 8.1 & 6.4 — Provider Job Detail Screen

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  TextInput,
  Platform,
} from 'react-native';
import * as storage from '../utils/storage';

export default function ProviderJobDetailScreen({ navigation, route }: any) {
  const { bookingId } = route.params;
  const token = storage.getAccessToken() || '';
  const baseUrl = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : (Platform.OS === 'web' ? 'http://localhost:3000' : 'http://localhost:3000');

  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [rejecting, setRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
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

  const handleAcceptJob = async () => {
    try {
      setSubmitting(true);
      const res = await fetch(`${baseUrl}/api/v1/provider/bookings/${bookingId}/accept`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to accept job.');
      }

      Alert.alert('Success', 'You have accepted the job.');
      fetchJobDetails();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectJob = async () => {
    if (!rejectionReason.trim()) {
      Alert.alert('Validation Error', 'Please provide a reason for rejecting the job.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`${baseUrl}/api/v1/provider/bookings/${bookingId}/reject`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: rejectionReason }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to reject job.');
      }

      Alert.alert('Success', 'You have rejected this job assignment.');
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSubmitting(false);
      setRejecting(false);
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
        <Text style={styles.errorText}>Job not found or access denied.</Text>
      </View>
    );
  }

  // Get status color
  let statusColor = '#fff';
  if (booking.status === 'ASSIGNED') statusColor = '#3b82f6';
  else if (booking.status === 'ACCEPTED') statusColor = '#10b981';
  else if (booking.status === 'ON_THE_WAY') statusColor = '#fbbf24';
  else if (booking.status === 'STARTED') statusColor = '#a855f7';
  else if (booking.status === 'COMPLETED') statusColor = '#10b981';

  return (
    <View style={styles.outerContainer}>
      <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Job Details</Text>
        <Text style={styles.refText}>ACM-{booking.bookingReference}</Text>
      </View>

      {/* Details Card */}
      <View style={styles.card}>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Service</Text>
          <Text style={styles.value}>{booking.serviceNameSnapshot}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.label}>Scheduled Date</Text>
          <Text style={styles.value}>
            {new Date(booking.slotDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.label}>Time Slot</Text>
          <Text style={styles.value}>{booking.slotLabelSnapshot}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.label}>Status</Text>
          <Text style={[styles.value, { color: statusColor, fontWeight: 'bold' }]}>{booking.status}</Text>
        </View>
      </View>

      {/* Address Card */}
      <View style={styles.card}>
        <Text style={styles.cardSectionTitle}>Customer Address</Text>
        <Text style={styles.addressLabel}>{booking.addressSnapshot.label}</Text>
        <Text style={styles.addressText}>{booking.addressSnapshot.addressLine1}</Text>
        {booking.addressSnapshot.addressLine2 && <Text style={styles.addressText}>{booking.addressSnapshot.addressLine2}</Text>}
        <Text style={styles.addressText}>{booking.addressSnapshot.city} - {booking.addressSnapshot.pincode}</Text>
      </View>

      {/* Actions */}
      {booking.status === 'ASSIGNED' ? (
        rejecting ? (
          <View style={styles.rejectForm}>
            <Text style={styles.formLabel}>Rejection Reason *</Text>
            <TextInput
              style={styles.input}
              placeholder="Provide a reason for rejection..."
              placeholderTextColor="#94a3b8"
              value={rejectionReason}
              onChangeText={setRejectionReason}
              multiline
              numberOfLines={3}
            />
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.btnCancel]}
                onPress={() => setRejecting(false)}
                disabled={submitting}
              >
                <Text style={styles.btnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.btnRejectSubmit]}
                onPress={handleRejectJob}
                disabled={submitting}
              >
                {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.btnRejectSubmitText}>Submit Rejection</Text>}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.btnAccept]}
              onPress={handleAcceptJob}
              disabled={submitting}
            >
              {submitting ? <ActivityIndicator size="small" color="#020617" /> : <Text style={styles.btnAcceptText}>Accept Job</Text>}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.btnReject]}
              onPress={() => setRejecting(true)}
              disabled={submitting}
            >
              <Text style={styles.btnRejectText}>Reject Job</Text>
            </TouchableOpacity>
          </View>
        )
      ) : ['ACCEPTED', 'ON_THE_WAY', 'STARTED'].includes(booking.status) ? (
        <TouchableOpacity
          style={[styles.actionBtn, styles.btnUpdateStatus]}
          onPress={() => navigation.navigate('JobStatusUpdate', { bookingId })}
        >
          <Text style={styles.btnUpdateStatusText}>Update Job Status</Text>
        </TouchableOpacity>
      ) : null}

      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backBtnText}>Back to Dashboard</Text>
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
  refText: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
    fontWeight: '600',
  },
  card: {
    backgroundColor: 'hsl(222, 47%, 11%)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'hsl(217, 32%, 17%)',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  label: {
    fontSize: 14,
    color: '#94a3b8',
  },
  value: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '500',
  },
  cardSectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  addressLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  addressText: {
    fontSize: 14,
    color: '#cbd5e1',
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
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnAccept: {
    backgroundColor: '#10b981',
  },
  btnAcceptText: {
    color: '#020617',
    fontWeight: 'bold',
    fontSize: 15,
  },
  btnReject: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  btnRejectText: {
    color: '#f87171',
    fontWeight: 'bold',
    fontSize: 15,
  },
  btnUpdateStatus: {
    backgroundColor: '#10b981',
    width: '100%',
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  btnUpdateStatusText: {
    color: '#020617',
    fontWeight: 'bold',
    fontSize: 16,
  },
  backBtn: {
    width: '100%',
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 48,
  },
  backBtnText: {
    color: '#94a3b8',
    fontSize: 15,
    fontWeight: 'bold',
  },
  errorText: {
    color: '#f87171',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
  rejectForm: {
    backgroundColor: 'hsl(222, 47%, 11%)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'hsl(217, 32%, 17%)',
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    color: '#ffffff',
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
    borderColor: 'rgba(255,255,255,0.1)',
  },
  btnCancelText: {
    color: '#94a3b8',
    fontWeight: 'bold',
  },
  btnRejectSubmit: {
    backgroundColor: '#ef4444',
  },
  btnRejectSubmitText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
});
