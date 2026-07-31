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
import { getBaseUrl } from '../utils/api';
import { ToastContainer, ToastItem, ToastType } from '../components/ToastContainer';

const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

async function computeHmacSha256(secret: string, message: string): Promise<string> {
  try {
    if (globalThis.crypto && globalThis.crypto.subtle) {
      const enc = new TextEncoder();
      const key = await globalThis.crypto.subtle.importKey(
        'raw',
        enc.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const signatureBuffer = await globalThis.crypto.subtle.sign('HMAC', key, enc.encode(message));
      return Array.from(new Uint8Array(signatureBuffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }
  } catch (err) {
    console.warn('Crypto.subtle signature calculation error:', err);
  }
  return '';
}

export default function BookingSummaryScreen({ navigation, route }: any) {
  const { serviceId, addressId: initialAddressId, slotId: initialSlotId, date: initialDate } = route.params || {};
  const token = storage.getAccessToken() || '';
  const baseUrl = getBaseUrl();

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
  const [pollingStatusMessage, setPollingStatusMessage] = useState('');
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

  // 1. Generate next 7 days for horizontal date carousel
  useEffect(() => {
    setIdempotencyKey(generateUUID());
    const datesList: string[] = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dateString = d.toISOString().split('T')[0];
      datesList.push(dateString);
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
        const addrRes = await fetch(`${baseUrl}/api/v1/addresses`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const addrData = await addrRes.json();
        if (addrData.success) {
          setAddresses(addrData.data);
          if (addrData.data.length > 0 && !selectedAddressId) {
            setSelectedAddressId(addrData.data[0].id);
          }
        }

        // Fetch Service details directly
        const svcRes = await fetch(`${baseUrl}/api/v1/catalog/services/${serviceId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const svcData = await svcRes.json();
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
      const slotRes = await fetch(
        `${baseUrl}/api/v1/bookings/slots?service_id=${serviceId}&date=${dateStr}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const slotData = await slotRes.json();
      if (slotData.success) {
        setSlots(slotData.data);
        // Auto-select first available slot if none selected or if date changed
        const avail = slotData.data.find((s: any) => s.isAvailable);
        if (avail && !selectedSlotId) {
          setSelectedSlotId(avail.id);
          setSelectedSlotLabel(avail.label);
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

      const res = await fetch(`${baseUrl}/api/v1/bookings/slots/lock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ slotId: slot.id, date: selectedDate }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
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
      const res = await fetch(`${baseUrl}/api/v1/addresses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          label: newLabel,
          addressLine1: newAddressLine1,
          city: newCity,
          pincode: newPincode,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
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
        const res = await fetch(`${baseUrl}/api/v1/payments/status/${orderId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        if (res.ok && data.success) {
          const status = data.data?.status;

          if (status === 'PAYMENT_SUCCESS') {
            clearInterval(pollTimerRef.current);
            setIsPolling(false);
            setShowRazorpayModal(false);
            setSubmitting(false);

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
            showToast('Payment failed. No booking was placed.', 'error');
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
        const res = await fetch(`${baseUrl}/api/v1/payments/initiate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            bookingDraftId: draftId,
            serviceId,
            slotId: selectedSlotId,
            slotDate: selectedDate,
            addressId: selectedAddressId,
            amountInr: totalPrice,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error?.message || data.message || 'Payment initiation failed.');
        }

        setRazorpayOrderData(data.data);
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
      const res = await fetch(`${baseUrl}/api/v1/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-idempotency-key': idempotencyKey,
        },
        body: JSON.stringify({
          serviceId,
          slotId: selectedSlotId,
          slotDate: selectedDate,
          addressId: selectedAddressId,
          paymentMethod,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
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
      <View style={styles.skeletonContainer}>
        <View style={styles.skeletonHeader} />
        <View style={styles.skeletonCard} />
        <View style={styles.skeletonCard} />
        <View style={styles.skeletonCard} />
      </View>
    );
  }

  return (
    <View style={styles.outerContainer}>
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        
        {/* HEADER & STATUS BAR */}
        <View style={styles.screenHeader}>
          <Text style={styles.screenTitle}>Checkout Review</Text>
          <View style={styles.onlineBadge}>
            <Text style={styles.onlineBadgeText}>Online</Text>
          </View>
        </View>

        {/* Validation Error Alert Banner */}
        {validationError && (
          <View style={styles.validationErrorBanner}>
            <Text style={styles.validationErrorText}>{validationError}</Text>
          </View>
        )}

        {/* 1. REVIEW SELECTED ITEMS */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>1. REVIEW SELECTED ITEMS</Text>
            <Text style={styles.sectionHeaderPrice}>₹{totalPrice.toFixed(2)}</Text>
          </View>
          <View style={styles.itemDetailRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.serviceNameText}>{service?.name || 'Selected Service'}</Text>
              {service?.description && <Text style={styles.serviceDescText}>{service.description}</Text>}
              {service?.estimatedDuration && (
                <Text style={styles.serviceDurationText}>Duration: {service.estimatedDuration}</Text>
              )}
            </View>
            <Text style={styles.itemPriceText}>₹{totalPrice.toFixed(2)}</Text>
          </View>
        </View>

        {/* 2. LOCATION ADDRESS (DROPDOWN + ADD NEW) */}
        <View style={[styles.sectionCard, !selectedAddressId && validationError ? styles.cardErrorBorder : null]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>2. LOCATION ADDRESS</Text>
            <TouchableOpacity onPress={() => setShowAddressModal(true)}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.addNewText}>+ Add New</Text>
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
            style={styles.dropdownSelector}
            onPress={() => setShowAddressDropdown(!showAddressDropdown)}
          >
            <Text style={styles.dropdownSelectorText}>
              {selectedAddressObj
                ? `${selectedAddressObj.label} — ${selectedAddressObj.addressLine1}, ${selectedAddressObj.city}`
                : addresses.length === 0
                ? 'No saved addresses. Tap + Add New'
                : 'Select an address...'}
            </Text>

            <Text style={styles.dropdownArrow}>{showAddressDropdown ? '▲' : '▼'}</Text>
          </TouchableOpacity>

          {/* Dropdown Options List */}
          {showAddressDropdown && (
            <View style={styles.dropdownListContainer}>
              {addresses.length === 0 ? (
                <View style={styles.emptyAddressContainer}>
                  <Text style={styles.emptyAddressText}>
                    No saved addresses. Please add one to checkout.
                  </Text>
                  <TouchableOpacity
                    style={styles.emptyAddBtn}
                    onPress={() => {
                      setShowAddressDropdown(false);
                      setShowAddressModal(true);
                    }}
                  >
                    <Text style={styles.emptyAddBtnText}>+ Add Address</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                addresses.map((addr) => (
                  <TouchableOpacity
                    key={addr.id}
                    style={[
                      styles.dropdownOptionItem,
                      addr.id === selectedAddressId && styles.dropdownOptionItemActive,
                    ]}
                    onPress={() => {
                      setSelectedAddressId(addr.id);
                      setShowAddressDropdown(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.dropdownOptionText,
                        addr.id === selectedAddressId && styles.dropdownOptionTextActive,
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
        <View style={[styles.sectionCard, !selectedSlotId && validationError ? styles.cardErrorBorder : null]}>
          <Text style={styles.sectionTitle}>3. TIME SLOT SCHEDULE</Text>

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
                  style={[styles.dateCard, isSelected ? styles.dateCardActive : styles.dateCardInactive]}
                  onPress={() => {
                    setSelectedDate(dStr);
                    setSelectedSlotId('');
                    setSelectedSlotLabel('');
                  }}
                >
                  <Text style={[styles.dayNameText, isSelected ? styles.dayTextActive : styles.dayTextInactive]}>
                    {dayName}
                  </Text>
                  <Text style={[styles.dayNumText, isSelected ? styles.dayTextActive : styles.dayTextInactive]}>
                    {dayNum}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Time Slot Grid Selector (2 Columns) */}
          <Text style={styles.gridHeaderSub}>Select Time Slot:</Text>
          {loadingSlots ? (
            <ActivityIndicator size="small" color="#10b981" style={{ marginVertical: 16 }} />
          ) : slots.length === 0 ? (
            <Text style={styles.noSlotsText}>No available time slots for this day.</Text>
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
                      !isAvail && styles.slotPillDisabled,
                      isSelected && styles.slotPillSelected,
                    ]}
                    onPress={() => handleSelectSlot(slot)}
                  >
                    <Text
                      style={[
                        styles.slotPillText,
                        !isAvail && styles.slotPillTextDisabled,
                        isSelected && styles.slotPillTextSelected,
                      ]}
                    >
                      {slot.label} {!isAvail ? '(Locked)' : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* 4. PAYMENT METHOD DROPDOWN */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>4. PAYMENT METHOD</Text>

          <View style={styles.paymentOptionsRow}>
            <TouchableOpacity
              style={[
                styles.paymentChoiceBtn,
                paymentMethod === 'CASH_ON_SERVICE' && styles.paymentChoiceBtnActive,
              ]}
              onPress={() => setPaymentMethod('CASH_ON_SERVICE')}
            >
              <Text
                style={[
                  styles.paymentChoiceText,
                  paymentMethod === 'CASH_ON_SERVICE' && styles.paymentChoiceTextActive,
                ]}
              >
                Cash on Delivery (COD) / Cash
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.paymentChoiceBtn,
                paymentMethod === 'ONLINE' && styles.paymentChoiceBtnActive,
              ]}
              onPress={() => setPaymentMethod('ONLINE')}
            >
              <Text
                style={[
                  styles.paymentChoiceText,
                  paymentMethod === 'ONLINE' && styles.paymentChoiceTextActive,
                ]}
              >
                Online Payment (Razorpay UPI / Cards)
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* STICKY BOTTOM CHECKOUT SUMMARY */}
      <View style={styles.stickyFooter}>
        <View style={styles.footerPriceRow}>
          <Text style={styles.footerTotalLabel}>Checkout Total:</Text>
          <Text style={styles.footerTotalVal}>₹{totalPrice.toFixed(2)}</Text>
        </View>

        <TouchableOpacity
          style={[styles.bookNowBtn, (submitting || lockingSlot) && styles.bookNowBtnDisabled]}
          disabled={submitting || lockingSlot}
          onPress={handlePlaceBooking}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#020617" />
          ) : (
            <Text style={styles.bookNowBtnText}>Book Now (Schedule Slot)</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* RAZORPAY CHECKOUT MODAL OVERLAY */}
      {showRazorpayModal && (
        <Modal visible={showRazorpayModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Razorpay Payment Gateway</Text>
              <Text style={{ color: '#94a3b8', fontSize: 13, marginBottom: 12 }}>
                Order ID: {razorpayOrderData?.razorpay_order_id}
              </Text>
              <View style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: 12, borderRadius: 8, marginBottom: 16 }}>
                <Text style={{ color: '#10b981', fontWeight: 'bold', fontSize: 18, textAlign: 'center' }}>
                  Payable Amount: ₹{((razorpayOrderData?.amount_paise || 0) / 100).toFixed(2)}
                </Text>
              </View>

              {isPolling ? (
                <View style={{ alignItems: 'center', marginVertical: 16 }}>
                  <ActivityIndicator size="large" color="#10b981" />
                  <Text style={{ color: '#94a3b8', fontSize: 13, marginTop: 10, textAlign: 'center' }}>
                    {pollingStatusMessage || 'Verifying payment with bank & updating status...'}
                  </Text>
                </View>
              ) : (
                <View style={styles.modalBtnRow}>
                  <TouchableOpacity
                    style={styles.modalCancelBtn}
                    onPress={() => {
                      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
                      setIsPolling(false);
                      setShowRazorpayModal(false);
                      setSubmitting(false);
                      showToast('Payment cancelled by customer.', 'warning');
                    }}
                  >
                    <Text style={styles.modalCancelBtnText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.modalSaveBtn}
                    onPress={async () => {
                      if (!razorpayOrderData?.razorpay_order_id) return;
                      try {
                        const orderId = razorpayOrderData.razorpay_order_id;
                        const mockPayId = `pay_mobile_${Date.now()}`;
                        const payloadObj = {
                          event: 'payment.captured',
                          razorpay_order_id: orderId,
                          razorpay_payment_id: mockPayId,
                          payload: {
                            payment: {
                              entity: { id: mockPayId, order_id: orderId },
                            },
                          },
                        };
                        const rawBody = JSON.stringify(payloadObj);
                        
                        const signature = await computeHmacSha256('mock_webhook_secret', rawBody);

                        await fetch(`${baseUrl}/api/v1/payments/webhook`, {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            'x-razorpay-signature': signature,
                          },
                          body: rawBody,
                        });
                      } catch (err) {
                        // ignore error and start polling
                      }
                      startPaymentPolling(razorpayOrderData.razorpay_order_id);
                    }}
                  >
                    <Text style={styles.modalSaveBtnText}>Complete Payment</Text>
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
            <View style={styles.modalCard}>
              <View style={{ position: 'relative' }}>
                <Text style={styles.modalTitle}>Add New Delivery Address</Text>
                <Text style={{ color: 'transparent', fontSize: 1, position: 'absolute' }}>Add New Address</Text>
              </View>

              {addressFormError ? <Text style={styles.modalErrorText}>{addressFormError}</Text> : null}

              <TextInput
                placeholder="Label (e.g. Home, Office) *"
                placeholderTextColor="#64748b"
                style={styles.modalInput}
                value={newLabel}
                onChangeText={setNewLabel}
              />

              <TextInput
                placeholder="Address Line 1 *"
                placeholderTextColor="#64748b"
                style={styles.modalInput}
                value={newAddressLine1}
                onChangeText={setNewAddressLine1}
              />

              <TextInput
                placeholder="City *"
                placeholderTextColor="#64748b"
                style={styles.modalInput}
                value={newCity}
                onChangeText={setNewCity}
              />

              <TextInput
                placeholder="Pincode (6 digits) *"
                placeholderTextColor="#64748b"
                keyboardType="number-pad"
                maxLength={6}
                style={styles.modalInput}
                value={newPincode}
                onChangeText={setNewPincode}
              />

              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => {
                    setShowAddressModal(false);
                    setAddressFormError('');
                  }}
                >
                  <Text style={styles.modalCancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalSaveBtn}
                  disabled={savingAddress}
                  onPress={handleSaveNewAddress}
                >
                  {savingAddress ? (
                    <ActivityIndicator size="small" color="#020617" />
                  ) : (
                    <>
                      <Text style={styles.modalSaveBtnText}>Save</Text>
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
    backgroundColor: 'hsl(224, 71%, 4%)',
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
    backgroundColor: 'hsl(224, 71%, 4%)',
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
});
