// ─── apps/frontend/src/app/admin/(protected)/bookings/page.tsx ───
// Approved Wireframe Specification — Admin Booking Operations Console (SCR-MOD-002-WEB-001)
// Performance Optimized — Tab Caching, AbortController Race Protection, React.memo Row Isolation

'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import {
  Calendar,
  Search,
  RotateCcw,
  Copy,
  User,
  Wrench,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  X,
  ArrowUpDown,
  Loader2,
  ShieldAlert,
} from 'lucide-react';

interface Booking {
  id: string;
  bookingReference: string;
  customerId: string;
  customerName?: string;
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
}

interface StatusHistory {
  id: string;
  status: string;
  actorRole: string;
  note: string | null;
  createdAt: string;
}

interface CachedBookingData {
  data: Booking[];
  total: number;
  timestamp: number;
}

// Global/Module-level tab dataset cache with 3-minute TTL
const bookingCache = new Map<string, CachedBookingData>();
const CACHE_TTL_MS = 3 * 60 * 1000;

// Helper badge renderer
const renderStatusBadge = (status: string) => {
  switch (status) {
    case 'ACCEPTED':
    case 'COMPLETED':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-[#064E3B]/80 text-[#10B981] border border-[#059669]/30">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
          Completed
        </span>
      );
    case 'PENDING':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-[#451A03]/80 text-[#F59E0B] border border-[#B45309]/30">
          <Clock className="w-3.5 h-3.5 text-[#F59E0B]" />
          Pending
        </span>
      );
    case 'ASSIGNED':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-[#1E1B4B]/80 text-[#818CF8] border border-[#4338CA]/30">
          <User className="w-3.5 h-3.5 text-[#818CF8]" />
          Assigned
        </span>
      );
    case 'CANCELLED':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-[#450A0A]/80 text-[#EF4444] border border-[#B91C1C]/30">
          <XCircle className="w-3.5 h-3.5 text-[#EF4444]" />
          Cancelled
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
          {status}
        </span>
      );
  }
};

// ── MEMOIZED TABLE ROW COMPONENT ──
interface BookingRowProps {
  booking: Booking;
  isSelected: boolean;
  isActionOpen: boolean;
  onSelectRow: (b: Booking) => void;
  onToggleActionMenu: (bId: string, e: React.MouseEvent) => void;
  onCopyId: (ref: string, e: React.MouseEvent) => void;
  onViewDetailsPage: (bId: string) => void;
  actionMenuRef: React.RefObject<HTMLDivElement | null>;
}

const BookingTableRow = memo(function BookingTableRow({
  booking,
  isSelected,
  isActionOpen,
  onSelectRow,
  onToggleActionMenu,
  onCopyId,
  onViewDetailsPage,
  actionMenuRef,
}: BookingRowProps) {
  // Pre-calculate formatted values
  const formattedDate = useMemo(() => {
    return new Date(booking.slotDate).toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  }, [booking.slotDate]);

  const formattedPrice = useMemo(() => {
    return `₹${parseFloat(booking.servicePriceSnapshot).toFixed(2)}`;
  }, [booking.servicePriceSnapshot]);

  return (
    <tr
      onClick={() => onSelectRow(booking)}
      className={`transition-colors cursor-pointer group ${
        isSelected
          ? 'bg-[#10B981]/10 border-l-4 border-l-[#10B981]'
          : 'hover:bg-slate-800/40'
      }`}
    >
      {/* BOOKING ID COLUMN */}
      <td className="py-4 px-4 font-bold text-white font-mono whitespace-nowrap">
        <div className="flex items-center gap-1.5">
          <span>#{booking.bookingReference}</span>
          <button
            type="button"
            title="Copy Booking ID"
            onClick={(e) => onCopyId(booking.bookingReference, e)}
            className="p-1 text-slate-500 hover:text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>

      {/* CUSTOMER COLUMN */}
      <td className="py-4 px-4 text-slate-200 font-medium whitespace-nowrap">
        <div className="flex items-center gap-2">
          <User className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <span>{booking.customerName || 'Customer'}</span>
        </div>
      </td>

      {/* SERVICE COLUMN */}
      <td className="py-4 px-4 whitespace-nowrap">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#002B1D] border border-[#004D36] flex items-center justify-center text-[#10B981] flex-shrink-0">
            <Wrench className="w-4 h-4 text-[#10B981]" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-white text-xs">
              {booking.serviceNameSnapshot}
            </span>
            <span className="text-[11px] text-slate-400">Cleaning</span>
          </div>
        </div>
      </td>

      {/* PRICE COLUMN */}
      <td className="py-4 px-4 font-bold text-[#10B981] font-mono text-sm whitespace-nowrap">
        {formattedPrice}
      </td>

      {/* DATE/TIME SLOT COLUMN */}
      <td className="py-4 px-4 whitespace-nowrap">
        <div className="flex flex-col">
          <span className="font-medium text-slate-200">{formattedDate}</span>
          <span className="text-[11px] text-slate-400">{booking.slotLabelSnapshot}</span>
        </div>
      </td>

      {/* CURRENT STATUS COLUMN */}
      <td className="py-4 px-4 whitespace-nowrap">
        {renderStatusBadge(booking.status)}
      </td>

      {/* ACTIONS COLUMN */}
      <td className="py-4 px-4 text-right whitespace-nowrap relative">
        <div className="inline-block" ref={isActionOpen ? actionMenuRef : null}>
          <button
            type="button"
            onClick={(e) => onToggleActionMenu(booking.id, e)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {/* DROPDOWN MENU */}
          {isActionOpen && (
            <div
              className="absolute right-4 mt-1 w-44 bg-[#0F172A] border border-slate-800 rounded-xl shadow-xl z-30 py-1 text-left"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => onViewDetailsPage(booking.id)}
                className="w-full px-3.5 py-2 text-xs text-slate-200 hover:bg-slate-800 flex items-center gap-2"
              >
                <span>View Details Page</span>
              </button>
              <button
                type="button"
                onClick={() => onSelectRow(booking)}
                className="w-full px-3.5 py-2 text-xs text-slate-200 hover:bg-slate-800 flex items-center gap-2"
              >
                <span>{booking.status === 'PENDING' ? 'Assign Partner' : 'Reassign Partner'}</span>
              </button>
              {booking.status !== 'CANCELLED' && (
                <button
                  type="button"
                  disabled={booking.status === 'ACCEPTED'}
                  onClick={() => onSelectRow(booking)}
                  className={`w-full px-3.5 py-2 text-xs flex items-center gap-2 ${
                    booking.status === 'ACCEPTED'
                      ? 'text-slate-600 cursor-not-allowed'
                      : 'text-red-400 hover:bg-red-500/10'
                  }`}
                >
                  <span>Cancel Booking</span>
                </button>
              )}
            </div>
          )}
        </div>
      </td>
    </tr>
  );
});

export default function AdminBookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(10);

  const [statusCounts, setStatusCounts] = useState<{ [key: string]: number }>({
    ALL: 0, PENDING: 0, ASSIGNED: 0, ACCEPTED: 0, CANCELLED: 0,
  });

  // Action Menu Dropdown state for rows
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);

  // AbortController for race condition cancellation
  const abortControllerRef = useRef<AbortController | null>(null);

  // Drawer state for selected booking
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [drawerBooking, setDrawerBooking] = useState<Booking | null>(null);
  const [drawerHistory, setDrawerHistory] = useState<StatusHistory[]>([]);
  const [drawerProviders, setDrawerProviders] = useState<Provider[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<string>('');
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [actionSubmitting, setActionSubmitting] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
        setOpenActionMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch Tab Counts from API ONLY on initial load or date filter change
  const fetchStatusCounts = useCallback(async () => {
    try {
      const statuses = ['ALL', 'PENDING', 'ASSIGNED', 'ACCEPTED', 'CANCELLED'];
      const countsObj: { [key: string]: number } = { ALL: 0, PENDING: 0, ASSIGNED: 0, ACCEPTED: 0, CANCELLED: 0 };

      const results = await Promise.all(
        statuses.map(async (st) => {
          try {
            let url = '/api/v1/admin/bookings?limit=1';
            if (st !== 'ALL') url += `&status=${st}`;
            if (dateFilter) url += `&date=${dateFilter}`;
            const res = await apiClient.get(url);
            return { status: st, total: res.total || 0 };
          } catch { return { status: st, total: 0 }; }
        })
      );

      results.forEach((r) => { countsObj[r.status] = r.total; });
      setStatusCounts(countsObj);
    } catch (err) {
      console.error('Failed to fetch status counts:', err);
    }
  }, [dateFilter]);

  // Fetch Bookings with In-Memory Caching & AbortController Race Protection
  const fetchBookings = useCallback(async () => {
    const cacheKey = `${activeTab}:${dateFilter}:${page}:${limit}`;
    const cached = bookingCache.get(cacheKey);

    // Serve instantly from cache if fresh
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      setBookings(cached.data);
      setTotal(cached.total);
      setLoading(false);
      setError(null);
      return;
    }

    // Cancel any in-flight superseded request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      setLoading(true);
      setError(null);

      let statusQuery = activeTab === 'ALL' ? '' : activeTab;
      let url = `/api/v1/admin/bookings?page=${page}&limit=${limit}`;
      if (statusQuery) url += `&status=${statusQuery}`;
      if (dateFilter) url += `&date=${dateFilter}`;

      const data = await apiClient.get(url);
      if (data.success) {
        setBookings(data.data);
        setTotal(data.total);

        // Store in cache
        bookingCache.set(cacheKey, {
          data: data.data,
          total: data.total,
          timestamp: Date.now(),
        });
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return; // Ignore aborted requests
      if (err.status === 401 || err.status === 403) {
        router.push('/login/admin');
        return;
      }
      setError(err.message || 'Failed to fetch bookings');
    } finally {
      setLoading(false);
    }
  }, [activeTab, dateFilter, page, limit, router]);

  // Fetch status counts only on mount & when dateFilter changes
  useEffect(() => {
    fetchStatusCounts();
  }, [dateFilter, fetchStatusCounts]);

  // Fetch table bookings when activeTab, dateFilter, or page changes
  useEffect(() => {
    fetchBookings();
  }, [activeTab, dateFilter, page, fetchBookings]);

  // Clear cache on mutations to ensure fresh data
  const invalidateCache = useCallback(() => {
    bookingCache.clear();
  }, []);

  // Fetch Drawer Details when a booking row is selected
  const openBookingDrawer = useCallback(async (booking: Booking) => {
    setOpenActionMenuId(null);
    setSelectedBookingId(booking.id);
    setDrawerBooking(booking);
    setDrawerOpen(true);
    setDrawerLoading(true);

    try {
      let categoryId = '';
      try {
        const detailData = await apiClient.get(`/api/v1/admin/bookings/${booking.id}`);
        if (detailData.success) {
          setDrawerBooking(detailData.data);
          categoryId = detailData.data.service?.categoryId || '';
        }
      } catch { /* ignore detail fetch errors */ }

      try {
        const historyData = await apiClient.get(`/api/v1/admin/bookings/${booking.id}/history`);
        if (historyData.success) {
          setDrawerHistory(historyData.data);
        }
      } catch { /* ignore history fetch errors */ }

      try {
        const providersData = await apiClient.get(`/api/v1/admin/bookings/providers?service_category_id=${categoryId}`);
        if (providersData.success) {
          setDrawerProviders(providersData.data);
          if (providersData.data.length > 0) {
            setSelectedProviderId(providersData.data[0].id);
          }
        }
      } catch { /* ignore providers fetch errors */ }
    } catch (err) {
      console.error('Error loading drawer details:', err);
    } finally {
      setDrawerLoading(false);
    }
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setSelectedBookingId(null);
    setDrawerBooking(null);
  }, []);

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

  // Provider Assignment in Drawer
  const handleAssignProvider = useCallback(async () => {
    if (!selectedProviderId || !drawerBooking || actionSubmitting) return;

    try {
      setActionSubmitting(true);
      const method = drawerBooking.status === 'PENDING' ? 'assign' : 'reassign';

      await apiClient.patch(`/api/v1/admin/bookings/${drawerBooking.id}/${method}`, {
        providerId: selectedProviderId,
      });

      showToast('Provider assigned successfully!', 'success');
      invalidateCache();

      try {
        await fetchBookings();
        await fetchStatusCounts();
        const updatedBooking = { ...drawerBooking, status: 'ASSIGNED', providerId: selectedProviderId };
        await openBookingDrawer(updatedBooking);
      } catch (refetchErr) {
        console.error('Failed to refetch after provider assignment:', refetchErr);
        showToast('Provider assigned successfully, but table refetch failed.', 'warning');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to assign provider.', 'error');
    } finally {
      setActionSubmitting(false);
    }
  }, [selectedProviderId, drawerBooking, actionSubmitting, showToast, invalidateCache, fetchBookings, fetchStatusCounts, openBookingDrawer]);

  // Cancel Booking in Drawer
  const handleCancelBookingInDrawer = useCallback(async () => {
    if (!drawerBooking || actionSubmitting) return;
    if (drawerBooking.status === 'ACCEPTED') {
      showToast('Cannot cancel accepted booking (BR-002-001 restriction).', 'error');
      return;
    }
    if (!confirm('Are you sure you want to cancel this booking?')) return;

    try {
      setActionSubmitting(true);
      const data = await apiClient.patch(`/api/v1/admin/bookings/${drawerBooking.id}/cancel`, {
        reason: 'Admin cancelled from drawer console',
      });

      if (!data.success) {
        throw new Error(data.error?.message || data.message || 'Failed to cancel booking.');
      }

      showToast('Booking cancelled successfully.', 'success');
      invalidateCache();

      try {
        await fetchBookings();
        await fetchStatusCounts();
      } catch (e) {
        console.error('Refetch bookings failed:', e);
      }
      closeDrawer();
    } catch (err: any) {
      showToast(err.message || 'Failed to cancel booking.', 'error');
    } finally {
      setActionSubmitting(false);
    }
  }, [drawerBooking, actionSubmitting, showToast, invalidateCache, fetchBookings, fetchStatusCounts, closeDrawer]);

  // Memoized search filtering
  const filteredBookings = useMemo(() => {
    if (!searchQuery.trim()) return bookings;
    const q = searchQuery.toLowerCase().trim();
    return bookings.filter(
      (b) =>
        b.bookingReference.toLowerCase().includes(q) ||
        (b.customerName && b.customerName.toLowerCase().includes(q)) ||
        b.serviceNameSnapshot.toLowerCase().includes(q) ||
        b.id.toLowerCase().includes(q)
    );
  }, [bookings, searchQuery]);

  const isFilterActive = dateFilter !== '' || searchQuery !== '' || activeTab !== 'ALL';

  const handleClearFilters = useCallback(() => {
    setActiveTab('ALL');
    setDateFilter('');
    setSearchQuery('');
    setPage(1);
  }, []);

  const handleToggleActionMenu = useCallback((bId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenActionMenuId((prev) => (prev === bId ? null : bId));
  }, []);

  const handleCopyId = useCallback((ref: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(ref);
    showToast(`Copied #${ref} to clipboard`, 'info');
  }, [showToast]);

  const handleViewDetailsPage = useCallback((bId: string) => {
    setOpenActionMenuId(null);
    router.push(`/admin/bookings/${bId}`);
  }, [router]);

  const totalPages = useMemo(() => Math.ceil(total / limit) || 1, [total, limit]);

  return (
    <div className="flex flex-col gap-6 max-w-[1600px] mx-auto pb-12">
      {/* PAGE CONTENT HEADER */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-[#00281C] border border-[#004D36] flex items-center justify-center text-[#10B981] shadow-inner flex-shrink-0">
          <Calendar className="w-6 h-6 text-[#10B981]" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Bookings Operations Board
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5 font-normal">
            Track service assignments, evaluate slot lock constraints, and manage active schedules.
          </p>
        </div>
      </div>

      {/* HORIZONTAL STATUS NAVIGATION TABS */}
      <div className="border-b border-slate-800/80 flex gap-6 overflow-x-auto scrollbar-none">
        {[
          { id: 'ALL', label: 'All Bookings', badgeBg: 'bg-[#064E3B]', badgeText: 'text-[#10B981]' },
          { id: 'PENDING', label: 'Pending', badgeBg: 'bg-[#451A03]', badgeText: 'text-[#F59E0B]' },
          { id: 'ASSIGNED', label: 'Assigned', badgeBg: 'bg-[#1E1B4B]', badgeText: 'text-[#818CF8]' },
          { id: 'ACCEPTED', label: 'Accepted', badgeBg: 'bg-[#064E3B]', badgeText: 'text-[#10B981]' },
          { id: 'CANCELLED', label: 'Cancelled', badgeBg: 'bg-[#450A0A]', badgeText: 'text-[#EF4444]' },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          const count = statusCounts[tab.id] ?? (tab.id === 'ALL' ? total : 0);

          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setPage(1);
              }}
              className={`pb-3 text-xs sm:text-sm flex items-center gap-2.5 cursor-pointer whitespace-nowrap transition-all flex-shrink-0 outline-none ${
                isActive
                  ? 'text-white font-bold border-b-2 border-[#10B981]'
                  : 'text-slate-400 font-medium border-b-2 border-transparent hover:text-slate-200'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[11px] px-2 py-0.5 rounded-full font-bold min-w-[20px] text-center ${tab.badgeBg} ${tab.badgeText}`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ERROR BANNER */}
      {error && (
        <div className="bg-[#450A0A]/40 border border-[#EF4444]/40 p-4 rounded-xl text-[#F87171] text-xs sm:text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
          <button
            onClick={fetchBookings}
            className="ml-auto underline hover:no-underline font-semibold text-xs text-white"
          >
            Retry
          </button>
        </div>
      )}

      {/* SEARCH & FILTER TOOLBAR */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#090D16]/60 border border-slate-800/80 p-3 rounded-2xl">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          {/* SEARCH INPUT */}
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search bookings by ID, customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0F172A]/90 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#10B981]/60 focus:ring-1 focus:ring-[#10B981]/60 shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* DATE RANGE FILTER CONTROL */}
          <div className="relative w-full sm:w-52">
            <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setPage(1);
              }}
              className="w-full bg-[#0F172A]/90 border border-slate-800 rounded-xl pl-10 pr-3 py-2 text-xs text-white focus:outline-none focus:border-[#10B981]/60 text-slate-300 [&::-webkit-calendar-picker-indicator]:invert"
            />
          </div>

        </div>

        {/* CLEAR FILTERS BUTTON */}
        {isFilterActive && (
          <button
            onClick={handleClearFilters}
            className="flex items-center gap-1.5 text-xs text-[#10B981] hover:text-[#34D399] font-medium px-2 py-1 transition-colors self-end sm:self-center"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear Filters</span>
          </button>
        )}
      </div>

      {/* BOOKINGS TABLE CONTAINER */}
      <div className="bg-[#090D16]/90 border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md">
        {loading ? (
          /* SKELETON TABLE LOADING STATE */
          <div className="p-4 space-y-4">
            <div className="h-10 bg-slate-800/40 rounded-xl animate-pulse w-full" />
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-14 bg-slate-800/20 rounded-xl animate-pulse w-full flex items-center justify-between px-4 gap-4">
                <div className="w-24 h-4 bg-slate-800 rounded" />
                <div className="w-32 h-4 bg-slate-800 rounded" />
                <div className="w-28 h-4 bg-slate-800 rounded" />
                <div className="w-20 h-4 bg-slate-800 rounded" />
                <div className="w-28 h-4 bg-slate-800 rounded" />
                <div className="w-24 h-6 bg-slate-800 rounded-full" />
              </div>
            ))}
          </div>
        ) : (
          <div>
            {/* DESKTOP OPERATIONS BOARD TABLE (>= 768px) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[768px]">
                <thead>
                  <tr className="bg-[#0F172A]/80 border-b border-slate-800/80 text-slate-400 font-bold text-[11px] tracking-wider uppercase">
                    <th className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1">
                        BOOKING ID
                        <ArrowUpDown className="w-3 h-3 text-slate-500" />
                      </span>
                    </th>
                    <th className="py-3.5 px-4">CUSTOMER</th>
                    <th className="py-3.5 px-4">SERVICE</th>
                    <th className="py-3.5 px-4">PRICE</th>
                    <th className="py-3.5 px-4">DATE/TIME SLOT</th>
                    <th className="py-3.5 px-4">CURRENT STATUS</th>
                    <th className="py-3.5 px-4 text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {filteredBookings.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-16 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Calendar className="w-8 h-8 text-slate-600 mb-1" />
                          <p className="font-semibold text-sm text-slate-300">No bookings found</p>
                          <p className="text-xs text-slate-500">
                            {isFilterActive
                              ? 'Try clearing active search or date filters.'
                              : 'No active service bookings in the database.'}
                          </p>
                          {isFilterActive && (
                            <button
                              onClick={handleClearFilters}
                              className="mt-2 text-xs font-bold text-[#10B981] hover:underline"
                            >
                              Reset Filters
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredBookings.map((b) => (
                      <BookingTableRow
                        key={b.id}
                        booking={b}
                        isSelected={selectedBookingId === b.id}
                        isActionOpen={openActionMenuId === b.id}
                        onSelectRow={openBookingDrawer}
                        onToggleActionMenu={handleToggleActionMenu}
                        onCopyId={handleCopyId}
                        onViewDetailsPage={handleViewDetailsPage}
                        actionMenuRef={actionMenuRef}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* MOBILE RESPONSIVE BOOKING CARDS (< 768px) */}
            <div className="block md:hidden divide-y divide-slate-800/60">
              {filteredBookings.length === 0 ? (
                <div className="py-12 text-center text-slate-400 p-4">
                  <p className="font-semibold text-sm text-slate-300">No bookings found</p>
                </div>
              ) : (
                filteredBookings.map((b) => (
                  <div
                    key={b.id}
                    onClick={() => openBookingDrawer(b)}
                    className="p-4 flex flex-col gap-3 hover:bg-slate-800/30 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white font-mono text-sm">#{b.bookingReference}</span>
                        <button
                          type="button"
                          onClick={(e) => handleCopyId(b.bookingReference, e)}
                          className="p-1 text-slate-400 hover:text-white"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div>{renderStatusBadge(b.status)}</div>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-slate-300">
                        <Wrench className="w-3.5 h-3.5 text-[#10B981]" />
                        <span className="font-medium text-white">{b.serviceNameSnapshot}</span>
                      </div>
                      <span className="font-bold text-[#10B981] font-mono">
                        ₹{parseFloat(b.servicePriceSnapshot).toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/40">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-500" />
                        <span>{b.customerName || 'Customer'}</span>
                      </div>
                      <div>
                        {new Date(b.slotDate).toLocaleDateString('en-IN', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                        })}{' '}
                        • {b.slotLabelSnapshot}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* PAGINATION FOOTER */}
        {!loading && total > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-slate-800/80 bg-[#0F172A]/40 text-xs">
            <span className="text-slate-400">
              Showing <span className="font-semibold text-white">{Math.min((page - 1) * limit + 1, total)}</span> to{' '}
              <span className="font-semibold text-white">{Math.min(page * limit, total)}</span> of{' '}
              <span className="font-semibold text-white">{total}</span> bookings
            </span>

            {/* PAGINATION CONTROLS */}
            <div className="flex items-center gap-1.5">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-2 rounded-lg bg-[#0F172A] border border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {[...Array(totalPages)].map((_, i) => {
                const pageNum = i + 1;
                // Limit display of page numbers if totalPages > 5
                if (
                  totalPages > 6 &&
                  pageNum !== 1 &&
                  pageNum !== totalPages &&
                  Math.abs(pageNum - page) > 1
                ) {
                  if (pageNum === 2 || pageNum === totalPages - 1) {
                    return <span key={pageNum} className="text-slate-600 px-1">...</span>;
                  }
                  return null;
                }

                const isCurrent = page === pageNum;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`w-8 h-8 rounded-lg font-bold text-xs flex items-center justify-center transition-colors ${
                      isCurrent
                        ? 'bg-[#065F46] text-[#10B981] border border-[#059669]/40'
                        : 'bg-[#0F172A] border border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-2 rounded-lg bg-[#0F172A] border border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* INLINE RIGHT SLIDE-OUT DETAIL DRAWER (`#drawer-details`) */}
      {drawerOpen && drawerBooking && (
        <>
          <div
            onClick={closeDrawer}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-45 transition-opacity"
          />
          <aside
            id="drawer-details"
            className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-[#090D16] border-l border-slate-800/80 p-6 shadow-2xl z-50 flex flex-col justify-between overflow-y-auto"
          >
            <div className="flex flex-col gap-6">
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
                <div>
                  <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
                    <span>Booking #{drawerBooking.bookingReference}</span>
                  </h2>
                  <div className="mt-1 flex items-center gap-2">
                    {renderStatusBadge(drawerBooking.status)}
                    <button
                      type="button"
                      onClick={() => router.push(`/admin/bookings/${drawerBooking.id}`)}
                      className="text-[11px] font-semibold text-[#10B981] hover:underline cursor-pointer ml-1"
                    >
                      Open Full Page →
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeDrawer}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {drawerLoading ? (
                <div className="py-12 text-center flex flex-col items-center justify-center gap-2 text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin text-[#10B981]" />
                  <span className="text-xs">Loading booking details...</span>
                </div>
              ) : (
                <>
                  {/* Detail attributes */}
                  <div className="flex flex-col gap-3 text-xs border-b border-slate-800/80 pb-6">
                    <div className="flex justify-between items-center py-1">
                      <span className="text-slate-400">Customer:</span>
                      <span className="text-white font-semibold flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        {drawerBooking.customerName || 'Customer'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-slate-400">Service:</span>
                      <span className="text-white font-semibold">{drawerBooking.serviceNameSnapshot}</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-slate-400">Price:</span>
                      <span className="text-[#10B981] font-bold font-mono text-sm">
                        ₹{parseFloat(drawerBooking.servicePriceSnapshot).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-slate-400">Slot Scheduled:</span>
                      <span className="text-slate-200 font-medium">
                        {new Date(drawerBooking.slotDate).toLocaleDateString('en-IN', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                        })}{' '}
                        ({drawerBooking.slotLabelSnapshot})
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-slate-400">Payment Mode:</span>
                      <span className="text-slate-200 font-medium">
                        {drawerBooking.paymentMethod === 'CASH_ON_SERVICE' ? 'COD / Cash' : 'Online'}
                      </span>
                    </div>
                  </div>

                  {/* Provider Assignment Section */}
                  <div className="flex flex-col gap-3 border-b border-slate-800/80 pb-6">
                    <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Assign Partner
                    </h3>
                    <div className="flex gap-2">
                      <select
                        disabled={actionSubmitting || drawerLoading}
                        value={selectedProviderId}
                        onChange={(e) => setSelectedProviderId(e.target.value)}
                        className="flex-1 bg-[#0F172A] border border-slate-800 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-[#10B981]/60 disabled:opacity-50 cursor-pointer"
                      >
                        {drawerProviders.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.displayName} ({p.serviceArea || 'General'})
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={actionSubmitting || drawerLoading}
                        onClick={handleAssignProvider}
                        className="bg-[#10B981] hover:bg-[#059669] text-slate-950 font-bold rounded-xl px-4 py-2 text-xs flex items-center gap-1.5 disabled:opacity-50 transition-colors cursor-pointer"
                      >
                        {actionSubmitting ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          'Assign'
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Status Transition Timeline */}
                  <div className="flex flex-col gap-3">
                    <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Status Transition History
                    </h3>
                    <div className="flex flex-col gap-3 pl-3 border-l border-slate-800">
                      {drawerHistory.length === 0 ? (
                        <div className="text-xs text-slate-400 py-1">
                          Booking Created (Status: {drawerBooking.status})
                        </div>
                      ) : (
                        drawerHistory.map((h) => (
                          <div key={h.id} className="relative pl-3">
                            <div className="absolute -left-[17px] top-1.5 w-2 h-2 rounded-full bg-[#10B981]" />
                            <p className="text-xs font-bold text-white">Status: {h.status}</p>
                            <p className="text-[10px] text-slate-400">
                              {new Date(h.createdAt).toLocaleTimeString()} by {h.actorRole}{' '}
                              {h.note ? `(${h.note})` : ''}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Action Footer */}
            <div className="border-t border-slate-800/80 pt-4 flex flex-col gap-2 mt-6">
              {drawerBooking.status === 'ACCEPTED' && (
                <div className="bg-red-500/10 border border-red-500/20 p-2.5 rounded-xl text-red-400 text-xs text-center font-bold flex items-center justify-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                  <span>Cannot cancel accepted booking (BR-002-001 restriction).</span>
                </div>
              )}
              <button
                type="button"
                disabled={actionSubmitting || drawerBooking.status === 'ACCEPTED'}
                onClick={handleCancelBookingInDrawer}
                className={`w-full py-2.5 rounded-xl font-bold text-xs transition-colors ${
                  drawerBooking.status === 'ACCEPTED'
                    ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                    : 'bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 cursor-pointer'
                }`}
              >
                Cancel Booking (Customer/Admin override)
              </button>
            </div>
          </aside>
        </>
      )}

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
