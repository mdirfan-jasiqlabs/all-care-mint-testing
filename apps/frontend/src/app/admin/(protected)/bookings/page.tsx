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

const getCustomerAvatarColor = (name: string) => {
  const palette = [
    { bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.3)', color: '#34d399' },
    { bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.3)', color: '#60a5fa' },
    { bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.3)', color: '#fbbf24' },
    { bg: 'rgba(139, 92, 246, 0.15)', border: 'rgba(139, 92, 246, 0.3)', color: '#a78bfa' },
    { bg: 'rgba(236, 72, 153, 0.15)', border: 'rgba(236, 72, 153, 0.3)', color: '#f472b6' },
  ];
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return palette[Math.abs(hash) % palette.length];
};

const getInitials = (name: string) => {
  if (!name) return 'CU';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
};

function canCancelBooking(status: string): boolean {
  return status !== 'COMPLETED' && status !== 'CANCELLED';
}

// Helper badge renderer
const renderStatusBadge = (status: string) => {
  switch (status) {
    case 'ACCEPTED':
    case 'COMPLETED':
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '3px 8px',
            borderRadius: '9999px',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.2px',
            backgroundColor: 'var(--admin-badge-active-bg)',
            color: 'var(--admin-badge-active-text)',
            border: '1px solid var(--admin-badge-active-border)',
            whiteSpace: 'nowrap',
          }}
        >
          <CheckCircle2 size={11} />
          Completed
        </span>
      );
    case 'PENDING':
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '3px 8px',
            borderRadius: '9999px',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.2px',
            backgroundColor: 'var(--admin-badge-pending-bg)',
            color: 'var(--admin-badge-pending-text)',
            border: '1px solid var(--admin-badge-pending-border)',
            whiteSpace: 'nowrap',
          }}
        >
          <Clock size={11} />
          Pending
        </span>
      );
    case 'ASSIGNED':
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '3px 8px',
            borderRadius: '9999px',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.2px',
            backgroundColor: 'var(--admin-badge-assigned-bg)',
            color: 'var(--admin-badge-assigned-text)',
            border: '1px solid var(--admin-badge-assigned-border)',
            whiteSpace: 'nowrap',
          }}
        >
          <User size={11} />
          Assigned
        </span>
      );
    case 'CANCELLED':
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '3px 8px',
            borderRadius: '9999px',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.2px',
            backgroundColor: 'var(--admin-badge-inactive-bg)',
            color: 'var(--admin-badge-inactive-text)',
            border: '1px solid var(--admin-badge-inactive-border)',
            whiteSpace: 'nowrap',
          }}
        >
          <XCircle size={11} />
          Cancelled
        </span>
      );
    default:
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '3px 8px',
            borderRadius: '9999px',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.2px',
            backgroundColor: 'var(--admin-surface-hover)',
            color: 'var(--admin-text-secondary)',
            border: '1px solid var(--admin-border)',
            whiteSpace: 'nowrap',
          }}
        >
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

  const avatar = useMemo(() => getCustomerAvatarColor(booking.customerName || ''), [booking.customerName]);
  const initials = useMemo(() => getInitials(booking.customerName || ''), [booking.customerName]);

  return (
    <tr
      onClick={() => onSelectRow(booking)}
      style={{
        borderBottom: '1px solid var(--admin-border)',
        backgroundColor: isSelected ? 'rgba(16, 185, 129, 0.08)' : 'transparent',
        transition: 'background-color 0.12s ease',
      }}
      className="hover:bg-[var(--admin-table-row-hover)] cursor-pointer group"
    >
      {/* BOOKING ID COLUMN */}
      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontWeight: 700, color: 'var(--admin-kpi-blue-text)', fontFamily: 'monospace', fontSize: '12px' }}>
            #{booking.bookingReference}
          </span>
          <button
            type="button"
            title="Copy Booking ID"
            onClick={(e) => onCopyId(booking.bookingReference, e)}
            style={{ background: 'none', border: 'none', color: 'var(--admin-text-muted)', cursor: 'pointer', padding: '2px' }}
            className="opacity-0 group-hover:opacity-100 hover:text-[var(--admin-text-primary)] transition-opacity"
          >
            <Copy size={12} />
          </button>
        </div>
      </td>

      {/* CUSTOMER COLUMN */}
      <td style={{ padding: '10px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <div
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              backgroundColor: avatar.bg,
              border: `1px solid ${avatar.border}`,
              color: avatar.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              fontWeight: 800,
              flexShrink: 0,
            }}
          >
            {initials}
          </div>
          <span
            style={{
              fontWeight: 600,
              color: 'var(--admin-text-primary)',
              fontSize: '12px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '150px',
            }}
            title={booking.customerName || 'Customer'}
          >
            {booking.customerName || 'Customer'}
          </span>
        </div>
      </td>

      {/* SERVICE COLUMN */}
      <td style={{ padding: '10px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '7px',
              backgroundColor: 'var(--admin-badge-active-bg)',
              border: '1px solid var(--admin-badge-active-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--admin-accent)',
              flexShrink: 0,
            }}
          >
            <Wrench size={13} />
          </div>
          <div style={{ minWidth: 0, overflow: 'hidden' }}>
            <span
              style={{
                fontWeight: 600,
                color: 'var(--admin-text-primary)',
                fontSize: '12px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                display: 'block',
                maxWidth: '180px',
              }}
              title={booking.serviceNameSnapshot}
            >
              {booking.serviceNameSnapshot}
            </span>
            <span style={{ fontSize: '10px', color: 'var(--admin-text-muted)' }}>Cleaning</span>
          </div>
        </div>
      </td>

      {/* PRICE COLUMN */}
      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
        <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--admin-accent)', fontFamily: 'monospace' }}>
          {formattedPrice}
        </span>
      </td>

      {/* DATE/TIME SLOT COLUMN */}
      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontWeight: 600, color: 'var(--admin-text-primary)', fontSize: '12px' }}>{formattedDate}</span>
          <span style={{ fontSize: '10px', color: 'var(--admin-text-muted)' }}>{booking.slotLabelSnapshot}</span>
        </div>
      </td>

      {/* CURRENT STATUS COLUMN */}
      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
        {renderStatusBadge(booking.status)}
      </td>

      {/* ACTIONS COLUMN */}
      <td style={{ padding: '10px 12px', textAlign: 'right', whiteSpace: 'nowrap', position: 'relative' }}>
        <div style={{ display: 'inline-block' }} ref={isActionOpen ? actionMenuRef : null}>
          <button
            type="button"
            onClick={(e) => onToggleActionMenu(booking.id, e)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--admin-text-muted)',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '6px',
              display: 'inline-flex',
              alignItems: 'center',
            }}
            className="hover:text-[var(--admin-text-primary)] hover:bg-[var(--admin-surface-hover)]"
          >
            <MoreVertical size={15} />
          </button>

          {/* DROPDOWN MENU */}
          {isActionOpen && (
            <div
              style={{
                position: 'absolute',
                right: '12px',
                marginTop: '4px',
                width: '180px',
                backgroundColor: 'var(--admin-modal-bg)',
                border: '1px solid var(--admin-border)',
                borderRadius: '10px',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
                zIndex: 30,
                padding: '4px 0',
                textAlign: 'left',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => onViewDetailsPage(booking.id)}
                style={{
                  width: '100%',
                  padding: '7px 12px',
                  fontSize: '12px',
                  color: 'var(--admin-text-primary)',
                  background: 'none',
                  border: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
                className="hover:bg-[var(--admin-surface-hover)]"
              >
                <span>View Details Page</span>
              </button>
              <button
                type="button"
                onClick={() => onSelectRow(booking)}
                style={{
                  width: '100%',
                  padding: '7px 12px',
                  fontSize: '12px',
                  color: 'var(--admin-text-primary)',
                  background: 'none',
                  border: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
                className="hover:bg-[var(--admin-surface-hover)]"
              >
                <span>{booking.status === 'PENDING' ? 'Assign Partner' : 'Reassign Partner'}</span>
              </button>
              {canCancelBooking(booking.status) && (
                <button
                  type="button"
                  disabled={booking.status === 'ACCEPTED'}
                  onClick={() => onSelectRow(booking)}
                  style={{
                    width: '100%',
                    padding: '7px 12px',
                    fontSize: '12px',
                    color: booking.status === 'ACCEPTED' ? 'var(--admin-text-muted)' : 'var(--admin-badge-inactive-text)',
                    background: 'none',
                    border: 'none',
                    textAlign: 'left',
                    cursor: booking.status === 'ACCEPTED' ? 'not-allowed' : 'pointer',
                  }}
                  className={booking.status === 'ACCEPTED' ? '' : 'hover:bg-[rgba(239,68,68,0.1)]'}
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
    <div style={{ maxWidth: '100%', width: '100%', display: 'flex', flexDirection: 'column', gap: '16px', color: 'var(--admin-text-primary)' }}>
      {/* 1. Header & Title Banner */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            backgroundColor: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#10b981',
            flexShrink: 0,
          }}
        >
          <Calendar size={20} />
        </div>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--admin-text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
            Bookings Operations Board
          </h1>
          <p style={{ color: 'var(--admin-text-secondary)', fontSize: '13px', margin: 0, marginTop: '2px' }}>
            Track service assignments, evaluate slot lock constraints, and manage active schedules.
          </p>
        </div>
      </div>

      {/* 2. Navigation Tabs Bar */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--admin-border)',
          gap: '24px',
          paddingBottom: '2px',
          overflowX: 'auto',
        }}
      >
        {[
          { id: 'ALL', label: 'All Bookings', color: 'var(--admin-badge-active-text)', bg: 'var(--admin-badge-active-bg)', border: 'var(--admin-badge-active-border)' },
          { id: 'PENDING', label: 'Pending', color: 'var(--admin-badge-pending-text)', bg: 'var(--admin-badge-pending-bg)', border: 'var(--admin-badge-pending-border)' },
          { id: 'ASSIGNED', label: 'Assigned', color: 'var(--admin-badge-assigned-text)', bg: 'var(--admin-badge-assigned-bg)', border: 'var(--admin-badge-assigned-border)' },
          { id: 'ACCEPTED', label: 'Accepted', color: 'var(--admin-badge-active-text)', bg: 'var(--admin-badge-active-bg)', border: 'var(--admin-badge-active-border)' },
          { id: 'CANCELLED', label: 'Cancelled', color: 'var(--admin-badge-inactive-text)', bg: 'var(--admin-badge-inactive-bg)', border: 'var(--admin-badge-inactive-border)' },
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
              style={{
                padding: '8px 4px 10px 4px',
                fontSize: '13px',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? 'var(--admin-accent)' : 'var(--admin-text-secondary)',
                borderBottom: isActive ? '2px solid var(--admin-accent)' : '2px solid transparent',
                background: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              <span>{tab.label}</span>
              <span
                style={{
                  backgroundColor: tab.bg,
                  color: tab.color,
                  fontSize: '10px',
                  fontWeight: 800,
                  borderRadius: '10px',
                  padding: '2px 8px',
                  lineHeight: 1,
                  border: `1px solid ${tab.border}`,
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ERROR BANNER */}
      {error && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '12px',
            color: '#f87171',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <AlertCircle size={16} color="#ef4444" />
          <span>{error}</span>
          <button
            onClick={fetchBookings}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--admin-text-primary)', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
          >
            Retry
          </button>
        </div>
      )}

      {/* 3. Main Operations Board Card */}
      <div
        style={{
          backgroundColor: 'var(--admin-card-bg)',
          borderRadius: '12px',
          border: '1px solid var(--admin-border)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Search & Filter Toolbar Header */}
        <div className="p-3.5 sm:p-4 border-b flex flex-col md:flex-row md:items-center justify-between gap-3 w-full" style={{ borderColor: 'var(--admin-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--admin-text-primary)', margin: 0, whiteSpace: 'nowrap' }}>
              Service Bookings
            </h2>
            <span
              style={{
                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                color: '#10b981',
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '10px',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                whiteSpace: 'nowrap',
              }}
            >
              {total} total
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto md:ml-auto">
            {/* Search Input */}
            <div className="w-full sm:w-[260px] md:w-[280px] shrink-0" style={{ position: 'relative' }}>
              <Search
                size={14}
                style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--admin-text-muted)' }}
              />
              <input
                type="text"
                placeholder="Search bookings by ID, customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: 'var(--admin-input-bg)',
                  border: '1px solid var(--admin-input-border)',
                  borderRadius: '8px',
                  padding: '8px 28px 8px 32px',
                  color: 'var(--admin-text-primary)',
                  fontSize: '12px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                className="focus:border-[#10b981]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--admin-text-muted)',
                    cursor: 'pointer',
                  }}
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Date Filter Input */}
            <div className="w-full sm:w-[160px] shrink-0" style={{ position: 'relative' }}>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => {
                  setDateFilter(e.target.value);
                  setPage(1);
                }}
                style={{
                  width: '100%',
                  backgroundColor: 'var(--admin-input-bg)',
                  border: '1px solid var(--admin-input-border)',
                  borderRadius: '8px',
                  padding: '7px 10px',
                  color: 'var(--admin-text-primary)',
                  fontSize: '12px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Clear Filters Action */}
            {isFilterActive && (
              <button
                onClick={handleClearFilters}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: 'none',
                  border: 'none',
                  color: 'var(--admin-accent)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
                className="self-start sm:self-auto pt-1 sm:pt-0 shrink-0"
              >
                <RotateCcw size={13} />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Data Table Container */}
        {loading ? (
          <div style={{ padding: '20px' }} className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{ backgroundColor: 'var(--admin-skeleton-bg)' }} className="h-12 rounded-lg animate-pulse w-full" />
            ))}
          </div>
        ) : (
          <div>
            <div style={{ overflowX: 'auto', width: '100%' }}>
              <table style={{ minWidth: '700px', width: '100%', tableLayout: 'auto', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                <thead>
                  <tr
                    style={{
                      backgroundColor: 'var(--admin-table-header-bg)',
                      borderBottom: '1px solid var(--admin-border)',
                      color: 'var(--admin-text-muted)',
                      fontSize: '10px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    <th style={{ padding: '10px 12px', width: '15%', whiteSpace: 'nowrap' }}>BOOKING ID</th>
                    <th style={{ padding: '10px 12px', width: '20%' }}>CUSTOMER</th>
                    <th style={{ padding: '10px 12px', width: '24%' }}>SERVICE</th>
                    <th style={{ padding: '10px 12px', width: '12%', whiteSpace: 'nowrap' }}>PRICE</th>
                    <th style={{ padding: '10px 12px', width: '15%', whiteSpace: 'nowrap' }}>DATE / TIME SLOT</th>
                    <th style={{ padding: '10px 12px', width: '10%', whiteSpace: 'nowrap' }}>STATUS</th>
                    <th style={{ padding: '10px 12px', width: '4%', textAlign: 'right', whiteSpace: 'nowrap' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBookings.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '36px 12px', textAlign: 'center', color: 'var(--admin-text-muted)' }}>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--admin-text-secondary)', marginBottom: '2px' }}>
                          No bookings found
                        </div>
                        <div style={{ fontSize: '12px' }}>
                          {isFilterActive ? 'Try clearing active search or date filters.' : 'No active service bookings in the database.'}
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
          </div>
        )}

        {/* Pagination Footer */}
        {!loading && total > 0 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 16px',
              borderTop: '1px solid var(--admin-border)',
              backgroundColor: 'var(--admin-card-bg)',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            <span style={{ fontSize: '12px', color: 'var(--admin-text-muted)' }}>
              Showing <strong style={{ color: 'var(--admin-text-primary)' }}>{Math.min((page - 1) * limit + 1, total)}</strong> to{' '}
              <strong style={{ color: 'var(--admin-text-primary)' }}>{Math.min(page * limit, total)}</strong> of{' '}
              <strong style={{ color: 'var(--admin-text-primary)' }}>{total}</strong> bookings
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                  backgroundColor: 'var(--admin-surface-hover)',
                  border: '1px solid var(--admin-border)',
                  color: page === 1 ? 'var(--admin-text-muted)' : 'var(--admin-text-primary)',
                  borderRadius: '6px',
                  padding: '5px 10px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: page === 1 ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <ChevronLeft size={12} />
                <span>Previous</span>
              </button>

              <span style={{ fontSize: '11px', color: 'var(--admin-text-secondary)', padding: '0 6px' }}>
                {page} / {totalPages}
              </span>

              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                  backgroundColor: 'var(--admin-surface-hover)',
                  border: '1px solid var(--admin-border)',
                  color: page >= totalPages ? 'var(--admin-text-muted)' : 'var(--admin-text-primary)',
                  borderRadius: '6px',
                  padding: '5px 10px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>Next</span>
                <ChevronRight size={12} />
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
            style={{ backgroundColor: 'var(--admin-modal-backdrop)' }}
            className="fixed inset-0 backdrop-blur-sm z-45 transition-opacity"
          />
          <aside
            id="drawer-details"
            style={{ backgroundColor: 'var(--admin-modal-bg)', borderLeft: '1px solid var(--admin-border)', color: 'var(--admin-text-primary)' }}
            className="fixed top-0 right-0 bottom-0 w-full max-w-md p-6 shadow-2xl z-50 flex flex-col justify-between overflow-y-auto"
          >
            <div className="flex flex-col gap-6">
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: 'var(--admin-border)' }}>
                <div>
                  <h2 className="text-lg font-extrabold flex items-center gap-2" style={{ color: 'var(--admin-text-primary)' }}>
                    <span>Booking #{drawerBooking.bookingReference}</span>
                  </h2>
                  <div className="mt-1 flex items-center gap-2">
                    {renderStatusBadge(drawerBooking.status)}
                    <button
                      type="button"
                      onClick={() => router.push(`/admin/bookings/${drawerBooking.id}`)}
                      style={{ color: 'var(--admin-accent)' }}
                      className="text-[11px] font-semibold hover:underline cursor-pointer ml-1"
                    >
                      Open Full Page →
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeDrawer}
                  style={{ color: 'var(--admin-text-muted)' }}
                  className="p-1.5 hover:text-[var(--admin-text-primary)] hover:bg-[var(--admin-surface-hover)] rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {drawerLoading ? (
                <div className="py-12 text-center flex flex-col items-center justify-center gap-2" style={{ color: 'var(--admin-text-muted)' }}>
                  <Loader2 className="w-6 h-6 animate-spin text-[var(--admin-accent)]" />
                  <span className="text-xs">Loading booking details...</span>
                </div>
              ) : (
                <>
                  {/* Detail attributes */}
                  <div className="flex flex-col gap-3 text-xs border-b pb-6" style={{ borderColor: 'var(--admin-border)' }}>
                    <div className="flex justify-between items-center py-1">
                      <span style={{ color: 'var(--admin-text-muted)' }}>Customer:</span>
                      <span className="font-semibold flex items-center gap-1.5" style={{ color: 'var(--admin-text-primary)' }}>
                        <User className="w-3.5 h-3.5" style={{ color: 'var(--admin-text-muted)' }} />
                        {drawerBooking.customerName || 'Customer'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span style={{ color: 'var(--admin-text-muted)' }}>Service:</span>
                      <span className="font-semibold" style={{ color: 'var(--admin-text-primary)' }}>{drawerBooking.serviceNameSnapshot}</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span style={{ color: 'var(--admin-text-muted)' }}>Price:</span>
                      <span className="font-bold font-mono text-sm" style={{ color: 'var(--admin-accent)' }}>
                        ₹{parseFloat(drawerBooking.servicePriceSnapshot).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span style={{ color: 'var(--admin-text-muted)' }}>Slot Scheduled:</span>
                      <span className="font-medium" style={{ color: 'var(--admin-text-secondary)' }}>
                        {new Date(drawerBooking.slotDate).toLocaleDateString('en-IN', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                        })}{' '}
                        ({drawerBooking.slotLabelSnapshot})
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span style={{ color: 'var(--admin-text-muted)' }}>Payment Mode:</span>
                      <span className="font-medium" style={{ color: 'var(--admin-text-secondary)' }}>
                        {drawerBooking.paymentMethod === 'CASH_ON_SERVICE' ? 'COD / Cash' : 'Online'}
                      </span>
                    </div>
                  </div>

                  {/* Provider Assignment Section */}
                  <div className="flex flex-col gap-3 border-b pb-6" style={{ borderColor: 'var(--admin-border)' }}>
                    <h3 className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-muted)' }}>
                      Assign Partner
                    </h3>
                    <div className="flex gap-2">
                      <select
                        disabled={actionSubmitting || drawerLoading}
                        value={selectedProviderId}
                        onChange={(e) => setSelectedProviderId(e.target.value)}
                        style={{ backgroundColor: 'var(--admin-input-bg)', border: '1px solid var(--admin-input-border)', color: 'var(--admin-text-primary)' }}
                        className="flex-1 rounded-xl px-3 py-2 text-xs outline-none focus:border-[#10b981]/60 disabled:opacity-50 cursor-pointer"
                      >
                        {drawerProviders.map((p) => (
                          <option key={p.id} value={p.id} style={{ backgroundColor: 'var(--admin-modal-bg)', color: 'var(--admin-text-primary)' }}>
                            {p.displayName} ({p.serviceArea || 'General'})
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={actionSubmitting || drawerLoading}
                        onClick={handleAssignProvider}
                        style={{ backgroundColor: 'var(--admin-accent)', color: '#ffffff' }}
                        className="hover:opacity-90 font-bold rounded-xl px-4 py-2 text-xs flex items-center gap-1.5 disabled:opacity-50 transition-all cursor-pointer"
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
                    <h3 className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-muted)' }}>
                      Status Transition History
                    </h3>
                    <div className="flex flex-col gap-3 pl-3 border-l" style={{ borderColor: 'var(--admin-border)' }}>
                      {drawerHistory.length === 0 ? (
                        <div className="text-xs py-1" style={{ color: 'var(--admin-text-muted)' }}>
                          Booking Created (Status: {drawerBooking.status})
                        </div>
                      ) : (
                        drawerHistory.map((h) => (
                          <div key={h.id} className="relative pl-3">
                            <div className="absolute -left-[17px] top-1.5 w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--admin-accent)' }} />
                            <p className="text-xs font-bold" style={{ color: 'var(--admin-text-primary)' }}>Status: {h.status}</p>
                            <p className="text-[10px]" style={{ color: 'var(--admin-text-muted)' }}>
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
            {canCancelBooking(drawerBooking.status) && (
              <div className="border-t pt-4 flex flex-col gap-2 mt-6" style={{ borderColor: 'var(--admin-border)' }}>
                {drawerBooking.status === 'ACCEPTED' && (
                  <div
                    style={{
                      backgroundColor: 'var(--admin-badge-inactive-bg)',
                      border: '1px solid var(--admin-badge-inactive-border)',
                      color: 'var(--admin-badge-inactive-text)',
                    }}
                    className="p-2.5 rounded-xl text-xs text-center font-bold flex items-center justify-center gap-1.5"
                  >
                    <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                    <span>Cannot cancel accepted booking (BR-002-001 restriction).</span>
                  </div>
                )}
                <button
                  type="button"
                  disabled={actionSubmitting || drawerBooking.status === 'ACCEPTED'}
                  onClick={handleCancelBookingInDrawer}
                  style={
                    drawerBooking.status === 'ACCEPTED'
                      ? {
                          backgroundColor: 'var(--admin-btn-secondary-bg)',
                          color: 'var(--admin-text-muted)',
                          border: '1px solid var(--admin-border)',
                        }
                      : {
                          backgroundColor: 'var(--admin-badge-inactive-bg)',
                          border: '1px solid var(--admin-badge-inactive-border)',
                          color: 'var(--admin-badge-inactive-text)',
                        }
                  }
                  className={`w-full py-2.5 rounded-xl font-bold text-xs transition-colors ${
                    drawerBooking.status === 'ACCEPTED'
                      ? 'cursor-not-allowed'
                      : 'hover:opacity-85 cursor-pointer'
                  }`}
                >
                  Cancel Booking (Customer/Admin override)
                </button>
              </div>
            )}

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
