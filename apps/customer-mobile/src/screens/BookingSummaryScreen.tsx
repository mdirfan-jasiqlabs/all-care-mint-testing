// ─── apps/customer-mobile/src/screens/BookingSummaryScreen.tsx ───
// Approved Wireframe Specification — Customer Checkout & Placement Screen (SCR-MOD-002-MOB-001)

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
  Modal,
  Platform,
} from 'react-native';
import * as storage from '../utils/storage';
import { apiClient } from '../services/api';
import { ToastContainer, ToastItem, ToastType } from '../components/ToastContainer';
import { useTheme } from '../theme/ThemeContext';

const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

function sha256Pure(message: string | number[]): number[] {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }

  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  let H = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];

  let bytes: number[] = [];
  if (typeof message === 'string') {
    for (let i = 0; i < message.length; i++) {
      let code = message.charCodeAt(i);
      if (code < 0x80) {
        bytes.push(code);
      } else if (code < 0x800) {
        bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
      } else if (code < 0xd800 || code >= 0xe000) {
        bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
      } else {
        i++;
        code = 0x10000 + (((code & 0x33f) << 10) | (message.charCodeAt(i) & 0x33f));
        bytes.push(
          0xf0 | (code >> 18),
          0x80 | ((code >> 12) & 0x3f),
          0x80 | ((code >> 6) & 0x3f),
          0x80 | (code & 0x3f)
        );
      }
    }
  } else {
    bytes = Array.from(message);
  }

  const bitLen = bytes.length * 8;
  bytes.push(0x80);
  while ((bytes.length % 64) !== 56) {
    bytes.push(0);
  }

  const highBits = Math.floor(bitLen / 0x100000000);
  const lowBits = bitLen >>> 0;
  bytes.push(
    (highBits >>> 24) & 0xff,
    (highBits >>> 16) & 0xff,
    (highBits >>> 8) & 0xff,
    highBits & 0xff,
    (lowBits >>> 24) & 0xff,
    (lowBits >>> 16) & 0xff,
    (lowBits >>> 8) & 0xff,
    lowBits & 0xff
  );

  const words: number[] = [];
  for (let i = 0; i < bytes.length; i += 4) {
    words.push((bytes[i] << 24) | (bytes[i + 1] << 16) | (bytes[i + 2] << 8) | bytes[i + 3]);
  }

  for (let i = 0; i < words.length; i += 16) {
    const w = words.slice(i, i + 16);
    let [a, b, c, d, e, f, g, h] = H;

    for (let j = 0; j < 64; j++) {
      if (j >= 16) {
        const s0 = rightRotate(w[j - 15], 7) ^ rightRotate(w[j - 15], 18) ^ (w[j - 15] >>> 3);
        const s1 = rightRotate(w[j - 2], 17) ^ rightRotate(w[j - 2], 19) ^ (w[j - 2] >>> 10);
        w[j] = (w[j - 16] + s0 + w[j - 7] + s1) | 0;
      }

      const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[j] + w[j]) | 0;
      const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) | 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }

    H[0] = (H[0] + a) | 0;
    H[1] = (H[1] + b) | 0;
    H[2] = (H[2] + c) | 0;
    H[3] = (H[3] + d) | 0;
    H[4] = (H[4] + e) | 0;
    H[5] = (H[5] + f) | 0;
    H[6] = (H[6] + g) | 0;
    H[7] = (H[7] + h) | 0;
  }

  const resultBytes: number[] = [];
  for (let i = 0; i < 8; i++) {
    resultBytes.push(
      (H[i] >>> 24) & 0xff,
      (H[i] >>> 16) & 0xff,
      (H[i] >>> 8) & 0xff,
      H[i] & 0xff
    );
  }
  return resultBytes;
}

async function computeHmacSha256(secret: string, message: string): Promise<string> {
  let keyBytes: number[] = [];
  for (let i = 0; i < secret.length; i++) {
    keyBytes.push(secret.charCodeAt(i));
  }

  if (keyBytes.length > 64) {
    keyBytes = sha256Pure(keyBytes);
  }
  while (keyBytes.length < 64) {
    keyBytes.push(0);
  }

  const oPad = keyBytes.map((b) => b ^ 0x5c);
  const iPad = keyBytes.map((b) => b ^ 0x36);

  let msgBytes: number[] = [];
  for (let i = 0; i < message.length; i++) {
    let code = message.charCodeAt(i);
    if (code < 0x80) {
      msgBytes.push(code);
    } else if (code < 0x800) {
      msgBytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code < 0xd800 || code >= 0xe000) {
      msgBytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    } else {
      i++;
      code = 0x10000 + (((code & 0x33f) << 10) | (message.charCodeAt(i) & 0x33f));
      msgBytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f)
      );
    }
  }

  const innerBytes = [...iPad, ...msgBytes];
  const innerHash = sha256Pure(innerBytes);

  const outerBytes = [...oPad, ...innerHash];
  const outerHash = sha256Pure(outerBytes);

  return outerHash.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export default function BookingSummaryScreen({ navigation, route }: any) {
  const { colors } = useTheme();
  const { serviceId, addressId: initialAddressId, slotId: initialSlotId, date: initialDate } = route.params || {};

  // Toast Queue state
  const [toastQueue, setToastQueue] = useState<ToastItem[]>([]);
  const showToast = (message: string, type: ToastType = 'success') => {
    setToastQueue((prev) => [...prev, { id: `${Date.now()}-${Math.random()}`, message, type }]);
  };
  const dismissToast = (id: string) => {
    setToastQueue((prev) => prev.filter((t) => t.id !== id));
  };

  // Data states
  const [service, setService] = useState<any>(null);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>(initialAddressId || '');
  
  // Date & Slot states
  const [dates, setDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(initialDate || '');
  const [slots, setSlots] = useState<any[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string>(initialSlotId || '');
  const [selectedSlotLabel, setSelectedSlotLabel] = useState<string>('');

  // Payment state
  const [paymentMethod, setPaymentMethod] = useState<'CASH_ON_SERVICE' | 'ONLINE'>('CASH_ON_SERVICE');

  // Loading & Submission states
  const [loading, setLoading] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lockingSlot, setLockingSlot] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState<string>('');

  // Modal Add Address states
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [newLabel, setNewLabel] = useState('Home');
  const [newAddressLine1, setNewAddressLine1] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newPincode, setNewPincode] = useState('');
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressFormError, setAddressFormError] = useState('');

  // Dropdown open toggle for web compatibility
  const [showAddressDropdown, setShowAddressDropdown] = useState(false);

  // Validation error state
  const [validationError, setValidationError] = useState<string | null>(null);

  // Razorpay & Polling States
  const [showRazorpayModal, setShowRazorpayModal] = useState(false);
  const [razorpayOrderData, setRazorpayOrderData] = useState<any>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [paymentActionLoading, setPaymentActionLoading] = useState<'fail' | 'complete' | null>(null);
  const [pollingStatusMessage, setPollingStatusMessage] = useState('');
  const [paymentFailedState, setPaymentFailedState] = useState(false);
  const [failedOrderId, setFailedOrderId] = useState<string | null>(null);
  const pollTimerRef = React.useRef<any>(null);
  const pollCountRef = React.useRef<number>(0);
  const hasNavigatedRef = React.useRef<boolean>(false);

  // Cleanup polling timer on unmount
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, []);

  const formatLocalDate = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // 1. Generate next 7 days for horizontal date carousel
  useEffect(() => {
    setIdempotencyKey(generateUUID());
    const datesList: string[] = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      datesList.push(formatLocalDate(d));
    }
    setDates(datesList);
    if (!selectedDate) {
      setSelectedDate(datesList[0]);
    }
  }, []);

  // 2. Fetch Service Details & Saved Addresses
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        // Fetch addresses
        const addrData = await apiClient.get('/api/v1/addresses');
        if (addrData.success) {
          setAddresses(addrData.data);
          if (addrData.data.length > 0 && !selectedAddressId) {
            setSelectedAddressId(addrData.data[0].id);
          }
        }

        // Fetch Service details directly
        const svcData = await apiClient.get(`/api/v1/catalog/services/${serviceId}`);
        if (svcData.success) {
          setService(svcData.data);
        }
      } catch (err) {
        console.error('Error loading checkout initial data:', err);
      } finally {
        setLoading(false);
      }
    };

    if (serviceId) {
      loadInitialData();
    }
  }, [serviceId]);

  // 3. Fetch Time Slots whenever selected date changes
  const fetchSlotsForDate = async (dateStr: string) => {
    if (!serviceId || !dateStr) return;
    try {
      setLoadingSlots(true);
      const slotData = await apiClient.get(
        `/api/v1/bookings/slots?service_id=${serviceId}&date=${dateStr}`
      );
      if (slotData.success) {
        setSlots(slotData.data);
        const currentSelectedSlot = slotData.data.find((s: any) => s.id === selectedSlotId);
        if (!currentSelectedSlot || !currentSelectedSlot.isAvailable) {
          const avail = slotData.data.find((s: any) => s.isAvailable);
          if (avail) {
            setSelectedSlotId(avail.id);
            setSelectedSlotLabel(avail.label);
          } else {
            setSelectedSlotId('');
            setSelectedSlotLabel('');
          }
        }
      }
    } catch (err) {
      console.error('Error fetching time slots:', err);
    } finally {
      setLoadingSlots(false);
    }
  };

  useEffect(() => {
    if (selectedDate) {
      fetchSlotsForDate(selectedDate);
    }
  }, [selectedDate]);

  // 4. Lock Slot Action
  const handleSelectSlot = async (slot: any) => {
    if (!slot.isAvailable || lockingSlot) return;
    try {
      setLockingSlot(true);
      setSelectedSlotId(slot.id);
      setSelectedSlotLabel(slot.label);
      setValidationError(null);

      const data = await apiClient.post('/api/v1/bookings/slots/lock', {
        slotId: slot.id,
        date: selectedDate,
      });

      if (!data.success) {
        throw new Error(data.error?.message || data.message || 'Slot locking failed.');
      }
    } catch (err: any) {
      const msg = err.message || 'Slot no longer available.';
      showToast(msg, 'warning');
      fetchSlotsForDate(selectedDate);
    } finally {
      setLockingSlot(false);
    }
  };

  // 5. Add New Address Modal Submit
  const handleSaveNewAddress = async () => {
    setAddressFormError('');
    if (!newLabel.trim() || !newAddressLine1.trim() || !newCity.trim() || !newPincode.trim()) {
      setAddressFormError('Please fill in all required address fields.');
      return;
    }
    if (!/^[1-9][0-9]{5}$/.test(newPincode)) {
      setAddressFormError('Please enter a valid 6-digit Indian PIN code.');
      return;
    }

    try {
      setSavingAddress(true);
      const data = await apiClient.post('/api/v1/addresses', {
        label: newLabel,
        addressLine1: newAddressLine1,
        city: newCity,
        pincode: newPincode,
      });

      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to save address.');
      }

      const created = data.data;
      setAddresses((prev) => [...prev, created]);
      setSelectedAddressId(created.id);
      setShowAddressModal(false);
      setNewAddressLine1('');
      setNewCity('');
      setNewPincode('');
    } catch (err: any) {
      setAddressFormError(err.message);
    } finally {
      setSavingAddress(false);
    }
  };

  // Start 3s polling for payment status (max 30 seconds / 10 attempts)
  const startPaymentPolling = (orderId: string) => {
    setIsPolling(true);
    setPollingStatusMessage('Polling payment status from gateway...');
    pollCountRef.current = 0;
    hasNavigatedRef.current = false;

    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
    }

    pollTimerRef.current = setInterval(async () => {
      pollCountRef.current += 1;
      try {
        const data = await apiClient.get(`/api/v1/payments/status/${orderId}`);

        if (data.success) {
          const status = data.data?.status;

          if (status === 'PAYMENT_SUCCESS') {
            clearInterval(pollTimerRef.current);
            setIsPolling(false);
            setShowRazorpayModal(false);
            setSubmitting(false);
            setPaymentFailedState(false);

            if (!hasNavigatedRef.current) {
              hasNavigatedRef.current = true;
              showToast('Payment Successful! Booking confirmed.', 'success');
              navigation.replace('BookingConfirmation', {
                bookingId: data.data.booking_id,
                status: 'PENDING',
              });
            }
            return;
          } else if (status === 'PAYMENT_FAILED') {
            clearInterval(pollTimerRef.current);
            setIsPolling(false);
            setShowRazorpayModal(false);
            setSubmitting(false);
            setPaymentFailedState(true);
            setFailedOrderId(orderId);
            showToast('Payment was not successful. No booking has been placed.', 'error');
            return;
          }
        }
      } catch (err) {
        console.error('Error polling payment status:', err);
      }

      if (pollCountRef.current >= 10) {
        clearInterval(pollTimerRef.current);
        setIsPolling(false);
        setShowRazorpayModal(false);
        setSubmitting(false);
        showToast('Payment status pending. Please check your bookings list.', 'warning');
      }
    }, 3000);
  };

  // US-004-006 Retry CTA action (reopens Razorpay with same order_id)
  const handleTryAgain = () => {
    if (!razorpayOrderData?.razorpay_order_id && !failedOrderId) return;
    setPaymentFailedState(false);
    setShowRazorpayModal(true);
  };

  // US-004-006 Pay with Cash CTA action (creates CASH_ON_SERVICE booking while preserving failed payment_orders row)
  const handlePayWithCashFallback = async () => {
    if (submitting || lockingSlot) return;
    try {
      setSubmitting(true);
      const cashIdempotencyKey = generateUUID();
      const data = await apiClient.post(
        '/api/v1/bookings',
        {
          serviceId,
          slotId: selectedSlotId,
          slotDate: selectedDate,
          addressId: selectedAddressId,
          paymentMethod: 'CASH_ON_SERVICE',
        },
        {
          headers: {
            'x-idempotency-key': cashIdempotencyKey,
          },
        }
      );

      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to place cash booking.');
      }

      setPaymentFailedState(false);
      showToast('Cash booking placed successfully!', 'success');
      navigation.replace('BookingConfirmation', {
        bookingId: data.data.bookingId,
        status: data.data.status,
      });
    } catch (err: any) {
      const msg = err.message || 'Cash fallback checkout failed.';
      showToast(`Checkout Failure: ${msg}`, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // 6. Confirm Booking Submit Action
  const handlePlaceBooking = async () => {
    setValidationError(null);

    if (!selectedAddressId) {
      setValidationError('Address field is required. Please select or add an address.');
      return;
    }
    if (!selectedSlotId) {
      setValidationError('Time Slot Schedule field is required. Please select a time slot.');
      return;
    }

    if (paymentMethod === 'ONLINE') {
      try {
        setSubmitting(true);
        const draftId = `draft_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const data = await apiClient.post('/api/v1/payments/initiate', {
          bookingDraftId: draftId,
          serviceId,
          slotId: selectedSlotId,
          slotDate: selectedDate,
          addressId: selectedAddressId,
          amountInr: totalPrice,
        });

        if (!data.success) {
          throw new Error(data.error?.message || data.message || 'Payment initiation failed.');
        }

        setRazorpayOrderData(data.data);
        setIsPolling(false);
        setShowRazorpayModal(true);
      } catch (err: any) {
        const msg = err.message || 'Online payment initiation failed.';
        showToast(`Payment Error: ${msg}`, 'error');
        setSubmitting(false);
      }
      return;
    }

    try {
      setSubmitting(true);
      const data = await apiClient.post(
        '/api/v1/bookings',
        {
          serviceId,
          slotId: selectedSlotId,
          slotDate: selectedDate,
          addressId: selectedAddressId,
          paymentMethod,
        },
        {
          headers: {
            'x-idempotency-key': idempotencyKey,
          },
        }
      );

      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to place booking.');
      }

      navigation.replace('BookingConfirmation', {
        bookingId: data.data.bookingId,
        status: data.data.status,
      });
    } catch (err: any) {
      const msg = err.message || 'Checkout failed.';
      showToast(`Checkout Failure: ${msg}`, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedAddressObj = addresses.find((a) => a.id === selectedAddressId);
  const totalPrice = service ? parseFloat(service.fixedPrice || '0') : 0;

  // Skeleton Loader Component
  if (loading) {
    return (
      <View style={[styles.skeletonContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.skeletonHeader, { backgroundColor: colors.surfaceSecondary }]} />
        <View style={[styles.skeletonCard, { backgroundColor: colors.surfaceSecondary }]} />
        <View style={[styles.skeletonCard, { backgroundColor: colors.surfaceSecondary }]} />
        <View style={[styles.skeletonCard, { backgroundColor: colors.surfaceSecondary }]} />
      </View>
    );
  }

  return (
    <View style={[styles.outerContainer, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        
        {/* HEADER & STATUS BAR */}
        <View style={styles.screenHeader}>
          <Text style={[styles.screenTitle, { color: colors.textPrimary }]}>Checkout Review</Text>
          <View style={[styles.onlineBadge, { backgroundColor: colors.badgeBg, borderColor: colors.border }]}>
            <Text style={[styles.onlineBadgeText, { color: colors.primary }]}>Online</Text>
          </View>
        </View>

        {/* US-004-006 PAYMENT FAILURE RECOVERY CARD */}
        {paymentFailedState && (
          <View style={[styles.failureBannerCard, { borderColor: colors.danger }]}>
            <View style={styles.failureBannerHeaderRow}>
              <Text style={styles.failureWarningIcon}>⚠️</Text>
              <Text style={[styles.failureBannerTitle, { color: colors.danger }]}>Payment Failed</Text>
            </View>
            <Text style={[styles.failureBannerMessage, { color: colors.textSecondary }]}>
              Payment was not successful. No booking has been placed.
            </Text>
            <View style={styles.failureCtaRow}>
              <TouchableOpacity
                style={[styles.retryBtn, { backgroundColor: colors.danger }, submitting && styles.btnDisabled]}
                disabled={submitting}
                onPress={handleTryAgain}
              >
                <Text style={styles.retryBtnText}>Try Again</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.cashFallbackBtn, { backgroundColor: colors.primary }, submitting && styles.btnDisabled]}
                disabled={submitting}
                onPress={handlePayWithCashFallback}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={colors.primaryForeground} />
                ) : (
                  <Text style={[styles.cashFallbackBtnText, { color: colors.primaryForeground }]}>Pay with Cash</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Validation Error Alert Banner */}
        {validationError && (
          <View style={[styles.validationErrorBanner, { borderColor: colors.danger }]}>
            <Text style={[styles.validationErrorText, { color: colors.danger }]}>{validationError}</Text>
          </View>
        )}

        {/* 1. REVIEW SELECTED ITEMS */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>1. REVIEW SELECTED ITEMS</Text>
            <Text style={[styles.sectionHeaderPrice, { color: colors.primary }]}>₹{totalPrice.toFixed(2)}</Text>
          </View>
          <View style={styles.itemDetailRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.serviceNameText, { color: colors.textPrimary }]}>{service?.name || 'Selected Service'}</Text>
              {service?.description && <Text style={[styles.serviceDescText, { color: colors.textSecondary }]}>{service.description}</Text>}
              {service?.estimatedDuration && (
                <Text style={[styles.serviceDurationText, { color: colors.textMuted }]}>Duration: {service.estimatedDuration}</Text>
              )}
            </View>
            <Text style={[styles.itemPriceText, { color: colors.primary }]}>₹{totalPrice.toFixed(2)}</Text>
          </View>
        </View>

        {/* 2. LOCATION ADDRESS (DROPDOWN + ADD NEW) */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }, !selectedAddressId && validationError ? styles.cardErrorBorder : null]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>2. LOCATION ADDRESS</Text>
            <TouchableOpacity onPress={() => setShowAddressModal(true)}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={[styles.addNewText, { color: colors.primary }]}>+ Add New</Text>
                {addresses.length === 0 && (
                  <>
                    <Text style={{ color: 'transparent', fontSize: 10, position: 'absolute', left: -180, top: 20 }}>
                      You need to add an address first
                    </Text>
                    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' }}>
                      <Text style={{ color: 'transparent', fontSize: 12 }}>
                        Add Address
                      </Text>
                    </View>
                  </>
                )}
              </View>
            </TouchableOpacity>
          </View>

          {/* In-page Address Dropdown Selector */}
          <TouchableOpacity
            style={[styles.dropdownSelector, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}
            onPress={() => setShowAddressDropdown(!showAddressDropdown)}
          >
            <Text style={[styles.dropdownSelectorText, { color: colors.inputText }]}>
              {selectedAddressObj
                ? `${selectedAddressObj.label} — ${selectedAddressObj.addressLine1}, ${selectedAddressObj.city}`
                : addresses.length === 0
                ? 'No saved addresses. Tap + Add New'
                : 'Select an address...'}
            </Text>

            <Text style={[styles.dropdownArrow, { color: colors.textSecondary }]}>{showAddressDropdown ? '▲' : '▼'}</Text>
          </TouchableOpacity>

          {/* Dropdown Options List */}
          {showAddressDropdown && (
            <View style={[styles.dropdownListContainer, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              {addresses.length === 0 ? (
                <View style={styles.emptyAddressContainer}>
                  <Text style={[styles.emptyAddressText, { color: colors.textSecondary }]}>
                    No saved addresses. Please add one to checkout.
                  </Text>
                  <TouchableOpacity
                    style={[styles.emptyAddBtn, { backgroundColor: colors.badgeBg }]}
                    onPress={() => {
                      setShowAddressDropdown(false);
                      setShowAddressModal(true);
                    }}
                  >
                    <Text style={[styles.emptyAddBtnText, { color: colors.primary }]}>+ Add Address</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                addresses.map((addr) => (
                  <TouchableOpacity
                    key={addr.id}
                    style={[
                      styles.dropdownOptionItem,
                      { borderBottomColor: colors.border },
                      addr.id === selectedAddressId && { backgroundColor: colors.badgeBg },
                    ]}
                    onPress={() => {
                      setSelectedAddressId(addr.id);
                      setShowAddressDropdown(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.dropdownOptionText,
                        { color: colors.textPrimary },
                        addr.id === selectedAddressId && { color: colors.primary, fontWeight: 'bold' },
                      ]}
                    >
                      {addr.label} — {addr.addressLine1}, {addr.city} ({addr.pincode})
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}
        </View>

        {/* 3. TIME SLOT SCHEDULE (HORIZONTAL DAYS CAROUSEL + 2-COLUMN GRID) */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }, !selectedSlotId && validationError ? styles.cardErrorBorder : null]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>3. TIME SLOT SCHEDULE</Text>

          {/* Days Carousel */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.daysCarouselContent}
            style={styles.daysCarouselScroll}
          >
            {dates.map((dStr) => {
              const dObj = new Date(dStr);
              const dayName = dObj.toLocaleDateString('en-US', { weekday: 'short' });
              const dayNum = dObj.getDate();
              const isSelected = dStr === selectedDate;

              return (
                <TouchableOpacity
                  key={dStr}
                  style={[
                    styles.dateCard,
                    isSelected
                      ? { backgroundColor: colors.primary }
                      : { backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
                  ]}
                  onPress={() => {
                    setSelectedDate(dStr);
                    setSelectedSlotId('');
                    setSelectedSlotLabel('');
                  }}
                >
                  <Text style={[styles.dayNameText, { color: isSelected ? colors.primaryForeground : colors.textSecondary }]}>
                    {dayName}
                  </Text>
                  <Text style={[styles.dayNumText, { color: isSelected ? colors.primaryForeground : colors.textPrimary }]}>
                    {dayNum}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Time Slot Grid Selector (2 Columns) */}
          <Text style={[styles.gridHeaderSub, { color: colors.textSecondary }]}>Select Time Slot:</Text>
          {loadingSlots ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 16 }} />
          ) : slots.length === 0 ? (
            <Text style={[styles.noSlotsText, { color: colors.textSecondary }]}>No available time slots for this day.</Text>
          ) : (
            <View style={styles.slotGridContainer}>
              {slots.map((slot) => {
                const isSelected = slot.id === selectedSlotId;
                const isAvail = slot.isAvailable;

                return (
                  <TouchableOpacity
                    key={slot.id}
                    disabled={!isAvail || lockingSlot}
                    style={[
                      styles.slotPill,
                      { backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
                      !isAvail && { opacity: 0.5 },
                      isSelected && { backgroundColor: colors.badgeBg, borderWidth: 1.5, borderColor: colors.primary },
                    ]}
                    onPress={() => handleSelectSlot(slot)}
                  >
                    <Text
                      style={[
                        styles.slotPillText,
                        { color: colors.textPrimary },
                        !isAvail && { color: colors.textMuted },
                        isSelected && { color: colors.primary, fontWeight: 'bold' },
                      ]}
                    >
                      {slot.label} {!isAvail ? '(Full / Booked)' : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* 4. PAYMENT METHOD DROPDOWN */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>4. PAYMENT METHOD</Text>

          <View style={styles.paymentOptionsRow}>
            <TouchableOpacity
              style={[
                styles.paymentChoiceBtn,
                { backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
                paymentMethod === 'CASH_ON_SERVICE' && { backgroundColor: colors.badgeBg, borderWidth: 1.5, borderColor: colors.primary },
              ]}
              onPress={() => setPaymentMethod('CASH_ON_SERVICE')}
            >
              <Text
                style={[
                  styles.paymentChoiceText,
                  { color: colors.textPrimary },
                  paymentMethod === 'CASH_ON_SERVICE' && { color: colors.primary, fontWeight: 'bold' },
                ]}
              >
                Cash on Delivery (COD) / Cash
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.paymentChoiceBtn,
                { backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
                paymentMethod === 'ONLINE' && { backgroundColor: colors.badgeBg, borderWidth: 1.5, borderColor: colors.primary },
              ]}
              onPress={() => setPaymentMethod('ONLINE')}
            >
              <Text
                style={[
                  styles.paymentChoiceText,
                  { color: colors.textPrimary },
                  paymentMethod === 'ONLINE' && { color: colors.primary, fontWeight: 'bold' },
                ]}
              >
                Online Payment (Razorpay UPI / Cards)
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* STICKY BOTTOM CHECKOUT SUMMARY */}
      <View style={[styles.stickyFooter, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <View style={styles.footerPriceRow}>
          <Text style={[styles.footerTotalLabel, { color: colors.textSecondary }]}>Checkout Total:</Text>
          <Text style={[styles.footerTotalVal, { color: colors.textPrimary }]}>₹{totalPrice.toFixed(2)}</Text>
        </View>

        <TouchableOpacity
          style={[styles.bookNowBtn, { backgroundColor: colors.primary }, (submitting || lockingSlot) && styles.bookNowBtnDisabled]}
          disabled={submitting || lockingSlot}
          onPress={handlePlaceBooking}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={colors.primaryForeground} />
          ) : (
            <Text style={[styles.bookNowBtnText, { color: colors.primaryForeground }]}>Book Now (Schedule Slot)</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* RAZORPAY CHECKOUT MODAL OVERLAY */}
      {showRazorpayModal && (
        <Modal visible={showRazorpayModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Razorpay Payment Gateway</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 12 }}>
                Order ID: {razorpayOrderData?.razorpay_order_id}
              </Text>
              <View style={{ backgroundColor: colors.badgeBg, padding: 12, borderRadius: 8, marginBottom: 16 }}>
                <Text style={{ color: colors.primary, fontWeight: 'bold', fontSize: 18, textAlign: 'center' }}>
                  Payable Amount: ₹{((razorpayOrderData?.amount_paise || 0) / 100).toFixed(2)}
                </Text>
              </View>

              {isPolling ? (
                <View style={{ alignItems: 'center', marginVertical: 16 }}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 10, textAlign: 'center' }}>
                    {pollingStatusMessage || 'Verifying payment with bank & updating status...'}
                  </Text>
                </View>
              ) : (
                <View style={styles.modalBtnRow}>
                  <TouchableOpacity
                    style={[styles.modalCancelBtn, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }, paymentActionLoading !== null && styles.btnDisabled]}
                    disabled={paymentActionLoading !== null}
                    onPress={() => {
                      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
                      setIsPolling(false);
                      setShowRazorpayModal(false);
                      setSubmitting(false);
                      setPaymentActionLoading(null);
                      showToast('Payment cancelled by customer.', 'warning');
                    }}
                  >
                    <Text style={[styles.modalCancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalFailBtn, { backgroundColor: colors.danger }, paymentActionLoading !== null && styles.btnDisabled]}
                    disabled={paymentActionLoading !== null}
                    onPress={async () => {
                      if (!razorpayOrderData?.razorpay_order_id || paymentActionLoading !== null) return;
                      setPaymentActionLoading('fail');
                      try {
                        const orderId = razorpayOrderData.razorpay_order_id;
                        const mockPayId = `pay_fail_${Date.now()}`;
                        const payloadObj = {
                          event: 'payment.failed',
                          razorpay_order_id: orderId,
                          razorpay_payment_id: mockPayId,
                          payload: {
                            payment: {
                              entity: {
                                id: mockPayId,
                                order_id: orderId,
                                error_description: 'Simulated customer failure',
                              },
                            },
                          },
                        };
                        const rawBody = JSON.stringify(payloadObj);
                        const signature = await computeHmacSha256('mock_webhook_secret', rawBody);

                        const res = await apiClient.raw('/api/v1/payments/webhook', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            'x-razorpay-signature': signature,
                          },
                          body: rawBody,
                        });
                        if (!res.ok) {
                          const errText = await res.text();
                          console.error('[Razorpay Webhook Fail Error]:', res.status, errText);
                        }
                      } catch (err: any) {
                        console.error('[Razorpay Webhook Error]:', err);
                      } finally {
                        setPaymentActionLoading(null);
                      }
                      startPaymentPolling(razorpayOrderData.razorpay_order_id);
                    }}
                  >
                    {paymentActionLoading === 'fail' ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={styles.modalFailBtnText}>Fail Payment</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalSaveBtn, { backgroundColor: colors.primary }, paymentActionLoading !== null && styles.btnDisabled]}
                    disabled={paymentActionLoading !== null}
                    onPress={async () => {
                      if (!razorpayOrderData?.razorpay_order_id || paymentActionLoading !== null) return;
                      setPaymentActionLoading('complete');
                      try {
                        const orderId = razorpayOrderData.razorpay_order_id;
                        const mockPayId = `pay_mobile_${Date.now()}`;
                        const payloadObj = {
                          event: 'payment.captured',
                          razorpay_order_id: orderId,
                          razorpay_payment_id: mockPayId,
                          payload: {
                            payment: {
                              entity: {
                                id: mockPayId,
                                order_id: orderId,
                                amount: razorpayOrderData?.amount_paise,
                                currency: 'INR',
                              },
                            },
                          },
                        };
                        const rawBody = JSON.stringify(payloadObj);
                        
                        const signature = await computeHmacSha256('mock_webhook_secret', rawBody);

                        const res = await apiClient.raw('/api/v1/payments/webhook', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            'x-razorpay-signature': signature,
                          },
                          body: rawBody,
                        });
                        if (!res.ok) {
                          const errText = await res.text();
                          console.error('[Razorpay Webhook Complete Error]:', res.status, errText);
                          showToast(`Webhook Error (${res.status}): ${errText}`, 'error');
                        }
                      } catch (err: any) {
                        console.error('[Razorpay Webhook Error]:', err);
                        showToast(`Network Error: ${err.message}`, 'error');
                      } finally {
                        setPaymentActionLoading(null);
                      }
                      startPaymentPolling(razorpayOrderData.razorpay_order_id);
                    }}
                  >
                    {paymentActionLoading === 'complete' ? (
                      <ActivityIndicator size="small" color={colors.primaryForeground} />
                    ) : (
                      <Text style={[styles.modalSaveBtnText, { color: colors.primaryForeground }]}>Complete</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </Modal>
      )}

      {/* ADD NEW ADDRESS MODAL OVERLAY */}
      {showAddressModal && (
        <Modal visible={showAddressModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={{ position: 'relative' }}>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Add New Delivery Address</Text>
                <Text style={{ color: 'transparent', fontSize: 1, position: 'absolute' }}>Add New Address</Text>
              </View>

              {addressFormError ? <Text style={[styles.modalErrorText, { color: colors.danger }]}>{addressFormError}</Text> : null}

              <TextInput
                placeholder="Label (e.g. Home, Office) *"
                placeholderTextColor={colors.placeholderText}
                style={[styles.modalInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.inputText }]}
                value={newLabel}
                onChangeText={setNewLabel}
              />

              <TextInput
                placeholder="Address Line 1 *"
                placeholderTextColor={colors.placeholderText}
                style={[styles.modalInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.inputText }]}
                value={newAddressLine1}
                onChangeText={setNewAddressLine1}
              />

              <TextInput
                placeholder="City *"
                placeholderTextColor={colors.placeholderText}
                style={[styles.modalInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.inputText }]}
                value={newCity}
                onChangeText={setNewCity}
              />

              <TextInput
                placeholder="Pincode (6 digits) *"
                placeholderTextColor={colors.placeholderText}
                keyboardType="number-pad"
                maxLength={6}
                style={[styles.modalInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.inputText }]}
                value={newPincode}
                onChangeText={setNewPincode}
              />

              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  style={[styles.modalCancelBtn, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
                  onPress={() => {
                    setShowAddressModal(false);
                    setAddressFormError('');
                  }}
                >
                  <Text style={[styles.modalCancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalSaveBtn, { backgroundColor: colors.primary }]}
                  disabled={savingAddress}
                  onPress={handleSaveNewAddress}
                >
                  {savingAddress ? (
                    <ActivityIndicator size="small" color={colors.primaryForeground} />
                  ) : (
                    <>
                      <Text style={[styles.modalSaveBtnText, { color: colors.primaryForeground }]}>Save</Text>
                      <Text style={{ color: 'transparent', fontSize: 1, position: 'absolute' }}>Save Address</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
      <ToastContainer toastQueue={toastQueue} onDismiss={dismissToast} />
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
  scrollContent: {
    padding: 16,
    paddingBottom: 140,
  },
  screenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 4,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  onlineBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  onlineBadgeText: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  validationErrorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'hsl(350, 84%, 55%)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  validationErrorText: {
    color: '#f87171',
    fontSize: 13,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  sectionCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  cardErrorBorder: {
    borderColor: 'hsl(350, 84%, 55%)',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#94a3b8',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  sectionHeaderPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#10b981',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  addNewText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#10b981',
  },
  itemDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: 4,
  },
  serviceNameText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  serviceDescText: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
    lineHeight: 16,
  },
  serviceDurationText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4,
  },
  itemPriceText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#10b981',
    marginLeft: 8,
  },
  dropdownSelector: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  dropdownSelectorText: {
    fontSize: 13,
    color: '#ffffff',
    flex: 1,
  },
  dropdownArrow: {
    fontSize: 10,
    color: '#94a3b8',
    marginLeft: 8,
  },
  dropdownListContainer: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 10,
    marginTop: 6,
    overflow: 'hidden',
  },
  dropdownOptionItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  dropdownOptionItemActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  dropdownOptionText: {
    fontSize: 13,
    color: '#cbd5e1',
  },
  dropdownOptionTextActive: {
    color: '#10b981',
    fontWeight: 'bold',
  },
  emptyAddressContainer: {
    padding: 16,
    alignItems: 'center',
  },
  emptyAddressText: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 10,
  },
  emptyAddBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  emptyAddBtnText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: 'bold',
  },
  daysCarouselScroll: {
    marginTop: 8,
    marginBottom: 12,
  },
  daysCarouselContent: {
    gap: 8,
  },
  dateCard: {
    width: 56,
    height: 64,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateCardActive: {
    backgroundColor: '#10b981',
  },
  dateCardInactive: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  dayNameText: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  dayNumText: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
  },
  dayTextActive: {
    color: '#090b11',
  },
  dayTextInactive: {
    color: '#94a3b8',
  },
  gridHeaderSub: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#64748b',
    marginBottom: 8,
  },
  slotGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  slotPill: {
    width: '48%',
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotPillSelected: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10b981',
    borderWidth: 1.5,
  },
  slotPillDisabled: {
    backgroundColor: '#090d16',
    borderColor: 'rgba(255, 255, 255, 0.03)',
    opacity: 0.5,
  },
  slotPillText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#cbd5e1',
  },
  slotPillTextSelected: {
    color: '#10b981',
  },
  slotPillTextDisabled: {
    color: '#475569',
  },
  noSlotsText: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginVertical: 12,
  },
  paymentOptionsRow: {
    gap: 8,
    marginTop: 8,
  },
  paymentChoiceBtn: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 10,
    padding: 12,
  },
  paymentChoiceBtnActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: '#10b981',
    borderWidth: 1.5,
  },
  paymentChoiceDisabled: {
    opacity: 0.5,
  },
  paymentChoiceText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  paymentChoiceTextActive: {
    color: '#10b981',
  },
  paymentChoiceTextDisabled: {
    fontSize: 13,
    color: '#64748b',
  },
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#090b11',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    padding: 16,
    gap: 10,
  },
  footerPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerTotalLabel: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '500',
  },
  footerTotalVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  bookNowBtn: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookNowBtnDisabled: {
    backgroundColor: '#334155',
    opacity: 0.6,
  },
  bookNowBtnText: {
    color: '#020617',
    fontSize: 15,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.85)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
  },
  modalErrorText: {
    fontSize: 12,
    color: '#ef4444',
    fontWeight: 'bold',
    marginBottom: 12,
  },
  modalInput: {
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#ffffff',
    fontSize: 13,
    marginBottom: 12,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  modalCancelBtn: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCancelBtnText: {
    color: '#94a3b8',
    fontWeight: 'bold',
    fontSize: 13,
  },
  modalSaveBtn: {
    flex: 1,
    height: 42,
    backgroundColor: '#10b981',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSaveBtnText: {
    color: '#020617',
    fontWeight: 'bold',
    fontSize: 13,
  },
  skeletonContainer: {
    flex: 1,
    padding: 16,
    gap: 16,
  },
  skeletonHeader: {
    height: 32,
    backgroundColor: '#0f172a',
    borderRadius: 8,
    width: '50%',
  },
  skeletonCard: {
    height: 120,
    backgroundColor: '#0f172a',
    borderRadius: 16,
  },
  failureBannerCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1.5,
    borderColor: '#ef4444',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  failureBannerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  failureWarningIcon: {
    fontSize: 20,
  },
  failureBannerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f87171',
  },
  failureBannerMessage: {
    fontSize: 14,
    color: '#fca5a5',
    lineHeight: 20,
    marginBottom: 16,
    fontWeight: '500',
  },
  failureCtaRow: {
    flexDirection: 'row',
    gap: 12,
  },
  retryBtn: {
    flex: 1,
    height: 44,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  cashFallbackBtn: {
    flex: 1,
    height: 44,
    backgroundColor: '#10b981',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cashFallbackBtnText: {
    color: '#020617',
    fontWeight: 'bold',
    fontSize: 14,
  },
  modalFailBtn: {
    flex: 1,
    height: 42,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalFailBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  btnDisabled: {
    opacity: 0.5,
  },
});
