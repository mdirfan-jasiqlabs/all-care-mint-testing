// ─── apps/frontend/src/app/admin/bookings/page.tsx ───
// Approved Wireframe Specification — Admin Booking Operations Console (SCR-MOD-002-WEB-001)

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

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

export default function AdminBookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active Status Tab Filter ('ALL', 'PENDING', 'ASSIGNED', 'ACCEPTED', 'CANCELLED')
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(10);

  // Drawer state for selected booking
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [drawerBooking, setDrawerBooking] = useState<Booking | null>(null);
  const [drawerHistory, setDrawerHistory] = useState<StatusHistory[]>([]);
  const [drawerProviders, setDrawerProviders] = useState<Provider[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<string>('');
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [actionSubmitting, setActionSubmitting] = useState(false);

  // Responsive state check (< 1024px)
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('access_token');

      let statusQuery = activeTab === 'ALL' ? '' : activeTab;
      let url = `http://localhost:3000/api/v1/admin/bookings?page=${page}&limit=${limit}`;
      if (statusQuery) url += `&status=${statusQuery}`;
      if (dateFilter) url += `&date=${dateFilter}`;

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token || ''}`,
        },
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          router.push('/admin/login');
          return;
        }
        throw new Error(`Failed to load bookings (${res.status})`);
      }

      const data = await res.json();
      if (data.success) {
        setBookings(data.data);
        setTotal(data.total);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [activeTab, dateFilter, page]);

  // Fetch Drawer Details when a booking row is selected
  const openBookingDrawer = async (booking: Booking) => {
    setSelectedBookingId(booking.id);
    setDrawerBooking(booking);
    setDrawerOpen(true);
    setDrawerLoading(true);

    try {
      const token = localStorage.getItem('access_token');

      // 1. Fetch complete details
      const detailRes = await fetch(`http://localhost:3000/api/v1/admin/bookings/${booking.id}`, {
        headers: { Authorization: `Bearer ${token || ''}` },
      });
      let categoryId = '';
      if (detailRes.ok) {
        const detailData = await detailRes.json();
        if (detailData.success) {
          setDrawerBooking(detailData.data);
          categoryId = detailData.data.service?.categoryId || '';
        }
      }

      // 2. Fetch history
      const historyRes = await fetch(`http://localhost:3000/api/v1/admin/bookings/${booking.id}/history`, {
        headers: { Authorization: `Bearer ${token || ''}` },
      });
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        if (historyData.success) {
          setDrawerHistory(historyData.data);
        }
      }

      // 3. Fetch matching providers for assignment
      const providersRes = await fetch(
        `http://localhost:3000/api/v1/admin/bookings/providers?service_category_id=${categoryId}`,
        { headers: { Authorization: `Bearer ${token || ''}` } },
      );
      if (providersRes.ok) {
        const providersData = await providersRes.json();
        if (providersData.success) {
          setDrawerProviders(providersData.data);
          if (providersData.data.length > 0) {
            setSelectedProviderId(providersData.data[0].id);
          }
        }
      }
    } catch (err) {
      console.error('Error loading drawer details:', err);
    } finally {
      setDrawerLoading(false);
    }
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setSelectedBookingId(null);
    setDrawerBooking(null);
  };

  // Top-Center Notification Queue State (Wireframe SCR-MOD-002-WEB-001)
  interface ToastMessage {
    id: string;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
  }

  const [toastQueue, setToastQueue] = useState<ToastMessage[]>([]);
  const [activeToast, setActiveToast] = useState<ToastMessage | null>(null);
  const [toastExiting, setToastExiting] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    const newItem: ToastMessage = { id: `${Date.now()}-${Math.random()}`, message, type };
    setToastQueue((prev) => [...prev, newItem]);
  };

  // 1. Process toast queue when no active toast is displayed
  useEffect(() => {
    if (!activeToast && toastQueue.length > 0) {
      const nextToast = toastQueue[0];
      setToastQueue((prev) => prev.slice(1));
      setActiveToast(nextToast);
      setToastExiting(false);
    }
  }, [activeToast, toastQueue]);

  // 2. Auto-dismiss active toast after exactly 3 seconds
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
  const handleAssignProvider = async () => {
    if (!selectedProviderId || !drawerBooking || actionSubmitting) return;

    try {
      setActionSubmitting(true);
      const token = localStorage.getItem('access_token');
      const method = drawerBooking.status === 'PENDING' ? 'assign' : 'reassign';

      const res = await fetch(`http://localhost:3000/api/v1/admin/bookings/${drawerBooking.id}/${method}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || ''}`,
        },
        body: JSON.stringify({ providerId: selectedProviderId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || data.message || `Failed to ${method} provider.`);
      }

      showToast('Provider assigned successfully!', 'success');

      // Separate refetch logic so secondary refetch failures don't trigger assignment failure
      try {
        await fetchBookings();
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
  };

  // Cancel Booking in Drawer
  const handleCancelBookingInDrawer = async () => {
    if (!drawerBooking || actionSubmitting) return;
    if (drawerBooking.status === 'ACCEPTED') {
      showToast('Cannot cancel accepted booking (BR-002-001 restriction).', 'error');
      return;
    }
    if (!confirm('Are you sure you want to cancel this booking?')) return;

    try {
      setActionSubmitting(true);
      const token = localStorage.getItem('access_token');
      const res = await fetch(`http://localhost:3000/api/v1/admin/bookings/${drawerBooking.id}/cancel`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || ''}`,
        },
        body: JSON.stringify({ reason: 'Admin cancelled from drawer console' }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || data.message || 'Failed to cancel booking.');
      }

      showToast('Booking cancelled successfully.', 'success');
      try {
        await fetchBookings();
      } catch (e) {
        console.error('Refetch bookings failed:', e);
      }
      closeDrawer();
    } catch (err: any) {
      showToast(err.message || 'Failed to cancel booking.', 'error');
    } finally {
      setActionSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'hsl(224, 71%, 4%)', color: '#f8fafc' }}>
      
      {/* DESKTOP RESOLUTION LOCK OVERLAY (< 1024px) */}
      {!isDesktop && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: '#020617',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '32px',
            textAlign: 'center',
          }}
        >
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', marginBottom: '16px' }}>
            ⚠️
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#ffffff', marginBottom: '8px' }}>
            Unsupported Device Viewport
          </h2>
          <p style={{ fontSize: '14px', color: '#94a3b8', maxWidth: '400px' }}>
            Bookings board requires a desktop resolution (1024px and above). Please maximize your browser window or use a desktop screen.
          </p>
        </div>
      )}

      {/* HEADER */}
      <header
        style={{
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          backgroundColor: 'rgba(9, 11, 17, 0.9)',
          backdropFilter: 'blur(12px)',
          padding: '16px 32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981' }} />
          <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.5px' }}>
            All Care <span style={{ color: '#10b981', fontWeight: 500 }}>Mint</span>
          </h1>
          <span style={{ fontSize: '11px', background: 'rgba(255, 255, 255, 0.08)', padding: '2px 8px', borderRadius: '20px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', marginLeft: '8px' }}>
            MOD-002 Console
          </span>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <span style={{ fontSize: '12px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '4px 12px', borderRadius: '20px', fontWeight: 600 }}>
            MOD-002 Active
          </span>
        </div>
      </header>

      {/* MAIN CONTAINER (SIDEBAR + CONTENT) */}
      <div style={{ flex: 1, display: 'flex', position: 'relative' }}>
        
        {/* APPROVED LEFT SIDEBAR */}
        <aside
          style={{
            width: '240px',
            backgroundColor: '#020617',
            borderRight: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '24px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
          }}
        >
          <div>
            <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px', paddingLeft: '8px' }}>
              Console Navigation
            </div>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <button
                onClick={() => router.push('/admin/dashboard')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  color: '#94a3b8',
                  background: 'transparent',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                Dashboard
              </button>
              <button
                onClick={() => router.push('/admin/catalog/categories')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  color: '#94a3b8',
                  background: 'transparent',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                Service Catalog
              </button>
              <button
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  color: '#10b981',
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                Manage Bookings *
              </button>
              <button
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  color: '#94a3b8',
                  background: 'transparent',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                Users & Access
              </button>
            </nav>
          </div>
        </aside>

        {/* MAIN PANEL CONTENT */}
        <main style={{ flex: 1, padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div>
            <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#ffffff' }}>Bookings Operations Board</h1>
            <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
              Track service assignments, evaluate slot lock constraints, and cancel active schedules.
            </p>
          </div>

          {/* HORIZONTAL STATUS TABS */}
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', gap: '24px' }}>
            {[
              { id: 'ALL', label: 'All Bookings' },
              { id: 'PENDING', label: 'Pending' },
              { id: 'ASSIGNED', label: 'Assigned' },
              { id: 'ACCEPTED', label: 'Accepted' },
              { id: 'CANCELLED', label: 'Cancelled' },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setPage(1);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    borderBottom: isActive ? '2px solid #10b981' : '2px solid transparent',
                    color: isActive ? '#ffffff' : '#94a3b8',
                    paddingBottom: '12px',
                    fontSize: '13px',
                    fontWeight: isActive ? 700 : 500,
                    cursor: 'pointer',
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {error && <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '12px 16px', borderRadius: '8px', color: '#f87171', fontSize: '14px' }}>{error}</div>}

          {/* BOOKINGS TABLE CONTAINER */}
          <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.45)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', padding: '24px' }}>
            {loading ? (
              <div style={{ padding: '48px', textAlign: 'center' }}>
                <div style={{ border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid #10b981', borderRadius: '50%', width: '32px', height: '32px', animation: 'spin 1s linear infinite', margin: '0 auto' }} />
              </div>
            ) : (
              <>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: '#64748b', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px' }}>
                      <th style={{ padding: '12px' }}>Booking ID</th>
                      <th style={{ padding: '12px' }}>Customer</th>
                      <th style={{ padding: '12px' }}>Service</th>
                      <th style={{ padding: '12px' }}>Price</th>
                      <th style={{ padding: '12px' }}>Date/Time Slot</th>
                      <th style={{ padding: '12px' }}>Current Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                          No active service bookings found.
                        </td>
                      </tr>
                    ) : (
                      bookings.map((b) => {
                        let statusBg = 'rgba(255,255,255,0.08)';
                        let statusColor = '#fff';
                        if (b.status === 'PENDING') { statusBg = 'rgba(251, 191, 36, 0.15)'; statusColor = '#fbbf24'; }
                        else if (b.status === 'ASSIGNED') { statusBg = 'rgba(99, 102, 241, 0.15)'; statusColor = '#818cf8'; }
                        else if (b.status === 'ACCEPTED') { statusBg = 'rgba(16, 185, 129, 0.15)'; statusColor = '#10b981'; }
                        else if (b.status === 'CANCELLED') { statusBg = 'rgba(239, 68, 68, 0.15)'; statusColor = '#ef4444'; }

                        const isSelectedRow = selectedBookingId === b.id;

                        return (
                          <tr
                            key={b.id}
                            onClick={() => openBookingDrawer(b)}
                            style={{
                              borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                              cursor: 'pointer',
                              backgroundColor: isSelectedRow ? 'rgba(16, 185, 129, 0.08)' : 'transparent',
                            }}
                          >
                            <td style={{ padding: '16px', fontWeight: 700, color: '#ffffff', fontFamily: 'monospace' }}>
                              #{b.bookingReference}
                            </td>
                            <td style={{ padding: '16px', color: '#cbd5e1' }}>
                              {b.customerName || 'Customer'}
                            </td>
                            <td style={{ padding: '16px', fontWeight: 500, color: '#ffffff' }}>
                              {b.serviceNameSnapshot}
                            </td>
                            <td style={{ padding: '16px', fontWeight: 700, color: '#10b981', fontFamily: 'monospace' }}>
                              ₹{parseFloat(b.servicePriceSnapshot).toFixed(2)}
                            </td>
                            <td style={{ padding: '16px', color: '#cbd5e1' }}>
                              {new Date(b.slotDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} ({b.slotLabelSnapshot})
                            </td>
                            <td style={{ padding: '16px' }}>
                              <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', backgroundColor: statusBg, color: statusColor }}>
                                {b.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>

                {/* PAGINATION */}
                {total > limit && (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '24px' }}>
                    <button
                      disabled={page === 1}
                      onClick={() => setPage((p) => p - 1)}
                      style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: page === 1 ? '#64748b' : '#fff', padding: '6px 12px', cursor: page === 1 ? 'not-allowed' : 'pointer' }}
                    >
                      Previous
                    </button>
                    <span style={{ alignSelf: 'center', color: '#94a3b8', fontSize: '13px' }}>
                      Page {page} of {Math.ceil(total / limit)}
                    </span>
                    <button
                      disabled={page >= Math.ceil(total / limit)}
                      onClick={() => setPage((p) => p + 1)}
                      style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: page >= Math.ceil(total / limit) ? '#64748b' : '#fff', padding: '6px 12px', cursor: page >= Math.ceil(total / limit) ? 'not-allowed' : 'pointer' }}
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </main>

        {/* INLINE RIGHT SLIDE-OUT DETAIL DRAWER (`#drawer-details`) */}
        {drawerOpen && drawerBooking && (
          <aside
            id="drawer-details"
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: '420px',
              backgroundColor: '#020617',
              borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
              padding: '28px',
              boxShadow: '-10px 0 30px rgba(0,0,0,0.5)',
              zIndex: 50,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Drawer Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '16px' }}>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff' }}>
                    Booking #{drawerBooking.bookingReference}
                  </h2>
                  <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', textTransform: 'uppercase', backgroundColor: drawerBooking.status === 'PENDING' ? 'rgba(251, 191, 36, 0.15)' : 'rgba(99, 102, 241, 0.15)', color: drawerBooking.status === 'PENDING' ? '#fbbf24' : '#818cf8' }}>
                    {drawerBooking.status}
                  </span>
                </div>
                <button
                  onClick={closeDrawer}
                  style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '14px', cursor: 'pointer', fontWeight: 600 }}
                >
                  ✕ Close
                </button>
              </div>

              {drawerLoading ? (
                <div style={{ padding: '32px', textAlign: 'center' }}>
                  <div style={{ border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid #10b981', borderRadius: '50%', width: '24px', height: '24px', animation: 'spin 1s linear infinite', margin: '0 auto' }} />
                </div>
              ) : (
                <>
                  {/* Detail attributes */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Customer:</span>
                      <span style={{ color: '#ffffff', fontWeight: 600 }}>{drawerBooking.customerName || 'Customer'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Service:</span>
                      <span style={{ color: '#ffffff', fontWeight: 600 }}>{drawerBooking.serviceNameSnapshot}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Price:</span>
                      <span style={{ color: '#10b981', fontWeight: 700, fontFamily: 'monospace' }}>₹{parseFloat(drawerBooking.servicePriceSnapshot).toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Slot Scheduled:</span>
                      <span style={{ color: '#ffffff', fontWeight: 600 }}>{new Date(drawerBooking.slotDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} ({drawerBooking.slotLabelSnapshot})</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Payment Mode:</span>
                      <span style={{ color: '#ffffff', fontWeight: 600 }}>{drawerBooking.paymentMethod === 'CASH_ON_SERVICE' ? 'COD / Cash' : 'Online'}</span>
                    </div>
                  </div>

                  {/* Provider Assignment Section */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '16px' }}>
                    <h3 style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Assign Partner
                    </h3>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <select
                        disabled={actionSubmitting || drawerLoading}
                        value={selectedProviderId}
                        onChange={(e) => setSelectedProviderId(e.target.value)}
                        style={{
                          flex: 1,
                          backgroundColor: '#0f172a',
                          border: '1px solid #1e293b',
                          borderRadius: '8px',
                          padding: '8px',
                          color: '#ffffff',
                          fontSize: '12px',
                          outline: 'none',
                          opacity: (actionSubmitting || drawerLoading) ? 0.6 : 1,
                          cursor: (actionSubmitting || drawerLoading) ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {drawerProviders.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.displayName} ({p.serviceArea || 'General'})
                          </option>
                        ))}
                      </select>
                      <button
                        disabled={actionSubmitting || drawerLoading}
                        onClick={handleAssignProvider}
                        style={{
                          backgroundColor: '#10b981',
                          border: 'none',
                          borderRadius: '8px',
                          color: '#020617',
                          fontWeight: 700,
                          padding: '8px 14px',
                          fontSize: '12px',
                          cursor: (actionSubmitting || drawerLoading) ? 'not-allowed' : 'pointer',
                          opacity: (actionSubmitting || drawerLoading) ? 0.7 : 1,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        {actionSubmitting ? (
                          <>
                            <span
                              style={{
                                width: '12px',
                                height: '12px',
                                border: '2px solid rgba(2, 6, 23, 0.3)',
                                borderTop: '2px solid #020617',
                                borderRadius: '50%',
                                animation: 'spin 0.8s linear infinite',
                                display: 'inline-block',
                              }}
                            />
                            <span>Assigning...</span>
                          </>
                        ) : (
                          'Assign'
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Status Transition Timeline */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <h3 style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Status Transition History
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingLeft: '12px', borderLeft: '1px solid #1e293b' }}>
                      {drawerHistory.length === 0 ? (
                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                          Booking Created (Status: {drawerBooking.status})
                        </div>
                      ) : (
                        drawerHistory.map((h) => (
                          <div key={h.id} style={{ position: 'relative' }}>
                            <div style={{ position: 'absolute', left: '-17px', top: '4px', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                            <p style={{ fontSize: '12px', fontWeight: 700, color: '#ffffff' }}>
                              Status: {h.status}
                            </p>
                            <p style={{ fontSize: '10px', color: '#64748b' }}>
                              {new Date(h.createdAt).toLocaleTimeString()} by {h.actorRole} {h.note ? `(${h.note})` : ''}
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
            <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {drawerBooking.status === 'ACCEPTED' && (
                <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '8px', borderRadius: '6px', color: '#f87171', fontSize: '11px', textAlign: 'center', fontWeight: 700 }}>
                  Cannot cancel accepted booking (BR-002-001 restriction).
                </div>
              )}
              <button
                disabled={actionSubmitting || drawerBooking.status === 'ACCEPTED'}
                onClick={handleCancelBookingInDrawer}
                style={{
                  backgroundColor: drawerBooking.status === 'ACCEPTED' ? '#1e293b' : 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: drawerBooking.status === 'ACCEPTED' ? '#64748b' : '#f87171',
                  borderRadius: '8px',
                  padding: '10px',
                  fontWeight: 700,
                  fontSize: '12px',
                  cursor: drawerBooking.status === 'ACCEPTED' ? 'not-allowed' : 'pointer',
                }}
              >
                Cancel Booking (Customer/Admin override)
              </button>
            </div>
          </aside>
        )}

      {/* Top-Center Accessible Toast Notification Queue */}
      {activeToast && (
        <div
          id="toast-notification"
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            top: '24px',
            left: '50%',
            transform: toastExiting ? 'translate(-50%, -20px)' : 'translate(-50%, 0)',
            opacity: toastExiting ? 0 : 1,
            backgroundColor:
              activeToast.type === 'success'
                ? '#064e3b'
                : activeToast.type === 'warning'
                ? '#78350f'
                : activeToast.type === 'info'
                ? '#1e3a8a'
                : '#7f1d1d',
            border: `1px solid ${
              activeToast.type === 'success'
                ? '#059669'
                : activeToast.type === 'warning'
                ? '#d97706'
                : activeToast.type === 'info'
                ? '#2563eb'
                : '#dc2626'
            }`,
            color: '#ffffff',
            padding: '12px 24px',
            borderRadius: '12px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontWeight: 600,
            fontSize: '14px',
            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            pointerEvents: 'none',
          }}
        >
          <span style={{ fontSize: '16px' }}>
            {activeToast.type === 'success' && '✓'}
            {activeToast.type === 'error' && '✕'}
            {activeToast.type === 'warning' && '⚠️'}
            {activeToast.type === 'info' && 'ℹ️'}
          </span>
          <span>{activeToast.message}</span>
        </div>
      )}
    </div>
  </div>
);
}
