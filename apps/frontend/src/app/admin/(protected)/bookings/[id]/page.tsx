// ─── apps/frontend/src/app/admin/(protected)/bookings/[id]/page.tsx ───
// Approved Wireframe Specification — Admin Booking Details & Assignment Page
// Performance Optimized & UI Aligned to Reference Screenshot

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { apiClient } from '@/lib/api';
import {
  ArrowLeft,
  FileText,
  Wrench,
  Calendar,
  CreditCard,
  User,
  Home,
  MapPin,
  Clock,
  Lock,
  Phone,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface Booking {
  id: string;
  bookingReference: string;
  customerId: string;
  providerId: string | null;
  serviceId: string;
  serviceNameSnapshot: string;
  servicePriceSnapshot: string;
  addressSnapshot: {
    label: string;
    addressLine1: string;
    addressLine2?: string | null;
    city: string;
    pincode: string;
  };
  slotDate: string;
  slotLabelSnapshot: string;
  paymentMethod: string;
  status: string;
  createdAt: string;
}

interface Provider {
  id: string;
  displayName: string;
  mobileNumber: string;
  serviceArea: string;
  categories?: { id: string; name: string }[];
  lastActiveAt?: string | null;
}

interface StatusHistory {
  id: string;
  status: string;
  actorRole: string;
  note: string | null;
  createdAt: string;
}

export default function AdminBookingDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [history, setHistory] = useState<StatusHistory[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // AbortController for race condition protection
  const abortControllerRef = useRef<AbortController | null>(null);
  const fetchedIdRef = useRef<string | null>(null);

  // Top-Center Notification Queue State
  interface ToastMessage {
    id: string;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
  }

  const [toastQueue, setToastQueue] = useState<ToastMessage[]>([]);
  const [activeToast, setActiveToast] = useState<ToastMessage | null>(null);
  const [toastExiting, setToastExiting] = useState(false);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    const newItem: ToastMessage = { id: `${Date.now()}-${Math.random()}`, message, type };
    setToastQueue((prev) => [...prev, newItem]);
  }, []);

  useEffect(() => {
    if (!activeToast && toastQueue.length > 0) {
      const nextToast = toastQueue[0];
      setToastQueue((prev) => prev.slice(1));
      setActiveToast(nextToast);
      setToastExiting(false);
    }
  }, [activeToast, toastQueue]);

  useEffect(() => {
    if (!activeToast) return;

    const timer = setTimeout(() => {
      setToastExiting(true);
      const exitTimer = setTimeout(() => {
        setActiveToast(null);
        setToastExiting(false);
      }, 300);
      return () => clearTimeout(exitTimer);
    }, 3000);

    return () => clearTimeout(timer);
  }, [activeToast]);

  // Optimized parallel data fetching
  const fetchData = useCallback(async () => {
    if (!id) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      setLoading(true);
      setError(null);

      // 1. Fetch main booking data
      const bookingData = await apiClient.get(`/api/v1/admin/bookings/${id}`);
      if (!bookingData.success || !bookingData.data) {
        throw new Error(bookingData.error?.message || 'Booking not found');
      }

      const b = bookingData.data;
      setBooking(b);
      fetchedIdRef.current = id;
      const categoryId = b.service?.categoryId || '';

      // 2. Concurrently fetch history logs & eligible providers
      const [historyRes, providersRes] = await Promise.allSettled([
        apiClient.get(`/api/v1/admin/bookings/${id}/history`),
        apiClient.get(`/api/v1/admin/bookings/providers?service_category_id=${categoryId}`),
      ]);

      if (historyRes.status === 'fulfilled' && historyRes.value.success) {
        setHistory(historyRes.value.data || []);
      }

      if (providersRes.status === 'fulfilled' && providersRes.value.success) {
        const provList = providersRes.value.data || [];
        setProviders(provList);
        if (provList.length > 0 && !b.providerId) {
          setSelectedProvider(provList[0].id);
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setError(err.message || 'Failed to fetch booking details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Provider Assignment handler
  const handleAssignProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProvider || submitting || !booking) return;

    const method = booking.status === 'PENDING' ? 'assign' : 'reassign';
    try {
      setSubmitting(true);
      
      await apiClient.patch(`/api/v1/admin/bookings/${id}/${method}`, {
        providerId: selectedProvider,
      });

      const assignedProv = providers.find(p => p.id === selectedProvider);
      const providerName = assignedProv ? assignedProv.displayName : 'Provider';
      showToast(`Provider ${providerName} assigned successfully.`, 'success');

      fetchedIdRef.current = null; // force refetch
      await fetchData();
    } catch (err: any) {
      showToast(err.message || `Failed to ${method} provider.`, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Cancel Booking handler
  const handleCancelBooking = async () => {
    if (!booking || submitting) return;
    if (booking.status === 'ACCEPTED') {
      showToast('Cannot cancel accepted booking (BR-002-001 restriction).', 'error');
      return;
    }
    if (!confirm('Are you sure you want to cancel this booking?')) return;

    try {
      setSubmitting(true);
      const data = await apiClient.patch(`/api/v1/admin/bookings/${id}/cancel`, {
        reason: 'Admin cancelled from details page',
      });

      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to cancel booking');
      }

      showToast('Booking cancelled successfully.', 'success');
      fetchedIdRef.current = null;
      await fetchData();
    } catch (err: any) {
      showToast(err.message || 'Failed to cancel booking', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Initial Loading Skeleton State
  if (loading) {
    return (
      <div className="flex flex-col gap-6 max-w-[1600px] mx-auto pb-12 animate-pulse">
        <div className="w-32 h-4 bg-slate-800 rounded" />
        <div className="space-y-2">
          <div className="w-64 h-8 bg-slate-800 rounded-lg" />
          <div className="w-96 h-4 bg-slate-800/60 rounded" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="bg-[#090D16]/90 border border-slate-800/80 rounded-2xl p-6 h-64" />
            <div className="bg-[#090D16]/90 border border-slate-800/80 rounded-2xl p-6 h-48" />
            <div className="bg-[#090D16]/90 border border-slate-800/80 rounded-2xl p-6 h-40" />
          </div>
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="bg-[#090D16]/90 border border-slate-800/80 rounded-2xl p-6 h-80" />
          </div>
        </div>
      </div>
    );
  }

  // Error State
  if (error || !booking) {
    return (
      <div className="max-w-xl mx-auto my-12 p-6 bg-[#450A0A]/40 border border-[#EF4444]/40 rounded-2xl text-center">
        <AlertCircle className="w-10 h-10 text-[#EF4444] mx-auto mb-3" />
        <h2 className="text-lg font-bold text-white mb-2">Failed to Load Booking</h2>
        <p className="text-xs sm:text-sm text-[#F87171] mb-6">{error || 'Booking not found.'}</p>
        <button
          onClick={() => router.push('/admin/bookings')}
          className="bg-[#10B981] hover:bg-[#059669] text-slate-950 font-bold px-6 py-2.5 rounded-xl text-xs sm:text-sm transition-colors"
        >
          ← Back to Bookings
        </button>
      </div>
    );
  }

  const assignedProvider = providers.find(p => p.id === booking.providerId);
  const isAssignmentLocked = !['PENDING', 'ASSIGNED'].includes(booking.status);

  // Generate Initials Avatar
  const getProviderInitials = (name?: string) => {
    if (!name) return 'P';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="flex flex-col gap-6 max-w-[1600px] mx-auto pb-12" style={{ color: 'var(--admin-text-primary)' }}>
      {/* BACK NAVIGATION LINK */}
      <div>
        <button
          type="button"
          onClick={() => router.push('/admin/bookings')}
          style={{ color: 'var(--admin-text-secondary)' }}
          className="inline-flex items-center gap-2 text-xs font-semibold hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Bookings</span>
        </button>
      </div>

      {/* PAGE TITLE & SUBTITLE */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: 'var(--admin-text-primary)' }}>
          Booking Details & Assignment
        </h1>
        <p className="text-xs sm:text-sm mt-1 font-normal" style={{ color: 'var(--admin-text-secondary)' }}>
          View booking details, customer information and provider assignment status.
        </p>
      </div>

      {/* TWO-COLUMN SPLIT DESKTOP GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT PANEL: DETAILS, CUSTOMER & TIMELINE (7 COLS) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          {/* CARD 1: SERVICE INFORMATION */}
          <div className="rounded-2xl p-6 shadow-xl backdrop-blur-md" style={{ backgroundColor: 'var(--admin-card-bg)', border: '1px solid var(--admin-border)' }}>
            {/* Header */}
            <div className="flex items-center gap-3 border-b pb-4 mb-6" style={{ borderColor: 'var(--admin-border)' }}>
              <div className="w-8 h-8 rounded-lg bg-[#002B1D] border border-[#004D36] flex items-center justify-center text-[#10B981] flex-shrink-0">
                <FileText className="w-4 h-4 text-[#10B981]" />
              </div>
              <h2 className="text-base sm:text-lg font-bold" style={{ color: 'var(--admin-text-primary)' }}>
                Service Information
              </h2>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Booked Service */}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#002B1D] border border-[#004D36] flex items-center justify-center text-[#10B981] flex-shrink-0 mt-0.5">
                  <Wrench className="w-5 h-5 text-[#10B981]" />
                </div>
                <div>
                  <span className="text-xs font-medium block" style={{ color: 'var(--admin-text-secondary)' }}>Booked Service</span>
                  <span className="text-sm font-bold mt-0.5 block" style={{ color: 'var(--admin-text-primary)' }}>
                    {booking.serviceNameSnapshot}
                  </span>
                </div>
              </div>

              {/* Amount Charged */}
              <div>
                <span className="text-xs font-medium block" style={{ color: 'var(--admin-text-secondary)' }}>Amount Charged</span>
                <span className="text-base sm:text-xl font-extrabold text-[#10B981] font-mono mt-0.5 block">
                  ₹{parseFloat(booking.servicePriceSnapshot).toFixed(2)}
                </span>
              </div>

              {/* Date & Slot */}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: 'var(--admin-surface-hover)', borderColor: 'var(--admin-border)' }}>
                  <Calendar className="w-5 h-5" style={{ color: 'var(--admin-text-secondary)' }} />
                </div>
                <div>
                  <span className="text-xs font-medium block" style={{ color: 'var(--admin-text-secondary)' }}>Date & Slot</span>
                  <span className="text-xs sm:text-sm font-bold mt-0.5 block" style={{ color: 'var(--admin-text-primary)' }}>
                    {new Date(booking.slotDate).toLocaleDateString('en-IN', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                  <span className="text-xs font-normal mt-0.5 block" style={{ color: 'var(--admin-text-secondary)' }}>
                    {booking.slotLabelSnapshot}
                  </span>
                </div>
              </div>

              {/* Payment Method */}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: 'var(--admin-surface-hover)', borderColor: 'var(--admin-border)' }}>
                  <CreditCard className="w-5 h-5" style={{ color: 'var(--admin-text-secondary)' }} />
                </div>
                <div>
                  <span className="text-xs font-medium block" style={{ color: 'var(--admin-text-secondary)' }}>Payment Method</span>
                  <span className="text-xs sm:text-sm font-bold mt-0.5 block" style={{ color: 'var(--admin-text-primary)' }}>
                    {booking.paymentMethod === 'CASH_ON_SERVICE' ? 'Cash on Service' : 'Online Payment'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* CARD 2: CUSTOMER & ADDRESS */}
          <div className="rounded-2xl p-6 shadow-xl backdrop-blur-md" style={{ backgroundColor: 'var(--admin-card-bg)', border: '1px solid var(--admin-border)' }}>
            {/* Header */}
            <div className="flex items-center gap-3 border-b pb-4 mb-6" style={{ borderColor: 'var(--admin-border)' }}>
              <div className="w-8 h-8 rounded-lg bg-[#2E1065] border border-[#4C1D95] flex items-center justify-center text-[#A855F7] flex-shrink-0">
                <User className="w-4 h-4 text-[#A855F7]" />
              </div>
              <h2 className="text-base sm:text-lg font-bold" style={{ color: 'var(--admin-text-primary)' }}>
                Customer & Address
              </h2>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Address Label */}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-950/40 border border-purple-800/30 flex items-center justify-center text-purple-400 flex-shrink-0 mt-0.5">
                  <Home className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <span className="text-xs font-medium block" style={{ color: 'var(--admin-text-secondary)' }}>Address Label</span>
                  <span className="text-xs sm:text-sm font-bold mt-0.5 block" style={{ color: 'var(--admin-text-primary)' }}>
                    {booking.addressSnapshot?.label || 'Home'}
                  </span>
                </div>
              </div>

              {/* Full Address */}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-950/40 border border-purple-800/30 flex items-center justify-center text-purple-400 flex-shrink-0 mt-0.5">
                  <MapPin className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <span className="text-xs font-medium block" style={{ color: 'var(--admin-text-secondary)' }}>Full Address</span>
                  <span className="text-xs sm:text-sm font-medium mt-0.5 block leading-relaxed" style={{ color: 'var(--admin-text-secondary)' }}>
                    {booking.addressSnapshot?.addressLine1}
                    {booking.addressSnapshot?.addressLine2 && `, ${booking.addressSnapshot.addressLine2}`}
                    <br />
                    {booking.addressSnapshot?.city} - {booking.addressSnapshot?.pincode}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* CARD 3: STATUS TRANSITION LOGS */}
          <div className="rounded-2xl p-6 shadow-xl backdrop-blur-md" style={{ backgroundColor: 'var(--admin-card-bg)', border: '1px solid var(--admin-border)' }}>
            {/* Header */}
            <div className="flex items-center gap-3 border-b pb-4 mb-6" style={{ borderColor: 'var(--admin-border)' }}>
              <div className="w-8 h-8 rounded-lg bg-[#451A03] border border-[#78350F] text-[#F59E0B] flex items-center justify-center flex-shrink-0">
                <Clock className="w-4 h-4 text-[#F59E0B]" />
              </div>
              <h2 className="text-base sm:text-lg font-bold" style={{ color: 'var(--admin-text-primary)' }}>
                Status Transition Logs
              </h2>
            </div>

            {/* Content */}
            {history.length === 0 ? (
              <div className="border border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center gap-2" style={{ backgroundColor: 'var(--admin-surface-hover)', borderColor: 'var(--admin-border)' }}>
                <FileText className="w-8 h-8 mb-1" style={{ color: 'var(--admin-text-muted)' }} />
                <p className="text-xs sm:text-sm font-semibold" style={{ color: 'var(--admin-text-primary)' }}>
                  No transition logs recorded.
                </p>
                <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                  Status changes will appear here.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4 pl-4 border-l relative" style={{ borderColor: 'var(--admin-border)' }}>
                {history.map((h, i) => (
                  <div key={h.id} className="relative pl-4">
                    <div
                      className={`absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full ${
                        i === 0 ? 'bg-[#10B981] shadow-[0_0_8px_#10B981]' : 'bg-slate-500'
                      }`}
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-xs sm:text-sm font-bold" style={{ color: 'var(--admin-text-primary)' }}>{h.status}</span>
                      <span className="text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>
                        {new Date(h.createdAt).toLocaleString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-secondary)' }}>
                      Updated by: <span className="font-medium" style={{ color: 'var(--admin-text-primary)' }}>{h.actorRole}</span>
                      {h.note ? ` — "${h.note}"` : ''}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL: PROVIDER ASSIGNMENT & ACTIONS (5 COLS) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="rounded-2xl p-6 shadow-xl backdrop-blur-md flex flex-col gap-6" style={{ backgroundColor: 'var(--admin-card-bg)', border: '1px solid var(--admin-border)' }}>
            {/* Header */}
            <div className="flex items-center gap-3 border-b pb-4" style={{ borderColor: 'var(--admin-border)' }}>
              <div className="w-8 h-8 rounded-lg bg-[#064E3B] border border-[#059669] text-[#10B981] flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-[#10B981]" />
              </div>
              <h2 className="text-base sm:text-lg font-bold" style={{ color: 'var(--admin-text-primary)' }}>
                Provider Assignment
              </h2>
            </div>

            {/* ASSIGNED PROVIDER DISPLAY */}
            {booking.providerId && assignedProvider ? (
              <div>
                <span className="text-xs font-semibold block mb-3" style={{ color: 'var(--admin-text-secondary)' }}>
                  Assigned Provider
                </span>
                <div className="border rounded-2xl p-4 flex items-start gap-4" style={{ backgroundColor: 'var(--admin-surface-hover)', borderColor: 'var(--admin-border)' }}>
                  <div className="w-12 h-12 rounded-full bg-[#065F46] border border-[#059669]/40 text-[#10B981] font-extrabold text-sm flex items-center justify-center flex-shrink-0 shadow-inner">
                    {getProviderInitials(assignedProvider.displayName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-extrabold truncate" style={{ color: 'var(--admin-text-primary)' }}>
                      {assignedProvider.displayName}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs mt-1" style={{ color: 'var(--admin-text-secondary)' }}>
                      <Phone className="w-3.5 h-3.5" style={{ color: 'var(--admin-text-muted)' }} />
                      <span>{assignedProvider.mobileNumber || '+91 76675 23718'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs mt-1" style={{ color: 'var(--admin-text-secondary)' }}>
                      <MapPin className="w-3.5 h-3.5" style={{ color: 'var(--admin-text-muted)' }} />
                      <span>{assignedProvider.serviceArea || 'Bangalore'}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : booking.providerId ? (
              <div>
                <span className="text-xs font-semibold block mb-2" style={{ color: 'var(--admin-text-secondary)' }}>
                  Assigned Provider ID
                </span>
                <div className="border rounded-2xl p-4 text-xs font-mono break-all" style={{ backgroundColor: 'var(--admin-surface-hover)', borderColor: 'var(--admin-border)', color: 'var(--admin-text-primary)' }}>
                  {booking.providerId}
                </div>
              </div>
            ) : (
              <div className="bg-[#451A03]/40 border border-[#B45309]/30 rounded-2xl p-4 text-xs text-[#F59E0B] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>No provider assigned yet. Booking is currently pending.</span>
              </div>
            )}

            {/* ASSIGNMENT EDIT FORM OR LOCKED STATE */}
            {!isAssignmentLocked ? (
              <form onSubmit={handleAssignProvider} className="flex flex-col gap-4 pt-2">
                <div>
                  <label className="text-xs font-semibold block mb-2" style={{ color: 'var(--admin-text-secondary)' }}>
                    Select Eligible Provider
                  </label>
                  <select
                    value={selectedProvider}
                    onChange={(e) => setSelectedProvider(e.target.value)}
                    disabled={submitting || loading}
                    style={{ backgroundColor: 'var(--admin-input-bg)', border: '1px solid var(--admin-input-border)', color: 'var(--admin-text-primary)' }}
                    className="w-full rounded-xl px-4 py-3 text-xs sm:text-sm outline-none focus:border-[#10B981]/60 disabled:opacity-50 cursor-pointer"
                    required
                  >
                    <option value="" style={{ backgroundColor: 'var(--admin-modal-bg)', color: 'var(--admin-text-primary)' }}>-- Choose Provider --</option>
                    {providers.map((p) => (
                      <option key={p.id} value={p.id} style={{ backgroundColor: 'var(--admin-modal-bg)', color: 'var(--admin-text-primary)' }}>
                        {p.displayName} ({p.serviceArea || 'General'})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={submitting || !selectedProvider}
                  className="w-full bg-[#10B981] hover:bg-[#059669] text-slate-950 font-bold py-3 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer shadow-lg shadow-[#10B981]/10"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                      <span>Assigning...</span>
                    </>
                  ) : booking.status === 'PENDING' ? (
                    'Assign Selected Provider'
                  ) : (
                    'Reassign to Selected Provider'
                  )}
                </button>
              </form>
            ) : (
              /* ASSIGNMENT LOCKED STATE BOX */
              <div className="border rounded-2xl p-5 flex items-start gap-4" style={{ backgroundColor: 'var(--admin-surface-hover)', borderColor: 'var(--admin-border)' }}>
                <div className="w-10 h-10 rounded-xl bg-blue-950/60 border border-blue-800/40 text-blue-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Lock className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold" style={{ color: 'var(--admin-text-primary)' }}>
                    Assignment locked.
                  </h3>
                  <p className="text-xs mt-1" style={{ color: 'var(--admin-text-secondary)' }}>
                    Booking status is in progress or resolved.
                  </p>
                </div>
              </div>
            )}

            {/* CANCEL BOOKING BUTTON */}
            {['PENDING', 'ASSIGNED'].includes(booking.status) && (
              <button
                type="button"
                onClick={handleCancelBooking}
                disabled={submitting}
                className="w-full bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-400 font-bold text-xs sm:text-sm rounded-xl py-3 transition-colors cursor-pointer"
              >
                Cancel Booking
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Top-Center Accessible Toast Notification Queue */}
      {activeToast && (
        <div
          id="toast-notification"
          role="status"
          aria-live="polite"
          className={`fixed top-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl shadow-2xl z-[10000] flex items-center gap-2.5 font-semibold text-sm text-white transition-all duration-300 pointer-events-none ${
            toastExiting ? '-translate-y-6 opacity-0' : 'translate-y-0 opacity-100'
          } ${
            activeToast.type === 'success'
              ? 'bg-[#064E3B] border border-[#059669]'
              : activeToast.type === 'warning'
              ? 'bg-[#78350F] border border-[#D97706]'
              : activeToast.type === 'info'
              ? 'bg-[#1E3A8A] border border-[#2563EB]'
              : 'bg-[#7F1D1D] border border-[#DC2626]'
          }`}
        >
          <span className="text-base">
            {activeToast.type === 'success' && '✓'}
            {activeToast.type === 'error' && '✕'}
            {activeToast.type === 'warning' && '⚠️'}
            {activeToast.type === 'info' && 'ℹ️'}
          </span>
          <span>{activeToast.message}</span>
        </div>
      )}
    </div>
  );
}
