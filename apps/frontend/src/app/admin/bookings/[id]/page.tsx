// ─── apps/frontend/src/app/admin/bookings/[id]/page.tsx ───
// Source: DLD Section 8.1 & 6.3 & 15.1 — Admin Booking Detail Split Panel Page

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

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

  // Top-Center Notification Queue State
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

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('access_token');

      // Fetch booking details
      const bookingRes = await fetch(`http://localhost:3000/api/v1/admin/bookings/${id}`, {
        headers: { 'Authorization': `Bearer ${token || ''}` },
      });
      if (!bookingRes.ok) {
        throw new Error('Failed to load booking details.');
      }
      const bookingData = await bookingRes.json();
      let categoryId = '';
      if (bookingData.success) {
        setBooking(bookingData.data);
        categoryId = bookingData.data.service?.categoryId || '';
      }

      // Fetch history
      const historyRes = await fetch(`http://localhost:3000/api/v1/admin/bookings/${id}/history`, {
        headers: { 'Authorization': `Bearer ${token || ''}` },
      });
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        if (historyData.success) {
          setHistory(historyData.data);
        }
      }

      // Fetch approved providers matching booking category
      const providersRes = await fetch(`http://localhost:3000/api/v1/admin/bookings/providers?service_category_id=${categoryId}`, {
        headers: { 'Authorization': `Bearer ${token || ''}` },
      });
      if (providersRes.ok) {
        const providersData = await providersRes.json();
        if (providersData.success) {
          setProviders(providersData.data);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  const handleAssignProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProvider || submitting) return;

    const method = booking?.status === 'PENDING' ? 'assign' : 'reassign';
    try {
      setSubmitting(true);
      const token = localStorage.getItem('access_token');
      
      const res = await fetch(`http://localhost:3000/api/v1/admin/bookings/${id}/${method}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`,
        },
        body: JSON.stringify({ providerId: selectedProvider }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || data.message || `Failed to ${method} provider.`);
      }

      const assignedProv = providers.find(p => p.id === selectedProvider);
      const providerName = assignedProv ? assignedProv.displayName : 'Provider';
      showToast(`Provider ${providerName} assigned. Booking is now ASSIGNED.`, 'success');

      try {
        await fetchData();
      } catch (refetchErr) {
        console.error('Failed to refetch details after assignment:', refetchErr);
        showToast('Provider assigned, but page refresh failed.', 'warning');
      }
    } catch (err: any) {
      showToast(err.message || `Failed to ${method} provider.`, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;

    try {
      setSubmitting(true);
      const token = localStorage.getItem('access_token');
      const res = await fetch(`http://localhost:3000/api/v1/admin/bookings/${id}/cancel`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`,
        },
        body: JSON.stringify({ reason: 'Admin cancelled from details page' }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to cancel booking');
      }

      showToast('Booking cancelled successfully.', 'success');
      fetchData();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
        <div className="alert-error">{error || 'Booking not found.'}</div>
        <button className="btn-primary" style={{ width: 'auto', padding: '0 20px' }} onClick={() => router.push('/admin/bookings')}>
          Back to Bookings
        </button>
      </div>
    );
  }

  // Find currently assigned provider details
  const currentProvider = providers.find(p => p.id === booking.providerId);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header
        style={{
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(9, 11, 17, 0.8)',
          backdropFilter: 'blur(12px)',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '16px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--primary)', boxShadow: '0 0 10px var(--primary)' }}></span>
            <h1 className="title-brand" style={{ fontSize: '20px', letterSpacing: '-0.5px', cursor: 'pointer' }} onClick={() => router.push('/admin/dashboard')}>
              All Care Mint
            </h1>
          </div>
          <button
            onClick={() => router.push('/admin/bookings')}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              color: '#94a3b8',
              padding: '8px 16px',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            ← Back to Bookings
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ flex: 1, maxWidth: '1200px', width: '100%', margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', background: 'rgba(255, 255, 255, 0.08)', padding: '4px 10px', borderRadius: '20px', color: 'var(--text-muted)' }}>
              ACM-{booking.bookingReference}
            </span>
            <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600, background: booking.status === 'PENDING' ? 'rgba(251, 191, 36, 0.15)' : 'rgba(59, 130, 246, 0.15)', color: booking.status === 'PENDING' ? '#fbbf24' : '#3b82f6' }}>
              {booking.status}
            </span>
          </div>
          <h2 style={{ fontSize: '28px', fontWeight: 600 }}>Booking Details & Assignment</h2>
        </div>

        {/* Split Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: '24px', alignItems: 'start' }}>
          
          {/* Left Panel: Details & Timeline */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Booking Details Card */}
            <div className="glass-card" style={{ maxWidth: '100%', padding: '32px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px' }}>
                Service Information
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Booked Service</div>
                  <div style={{ fontSize: '16px', fontWeight: 600, marginTop: '4px' }}>{booking.serviceNameSnapshot}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Amount Charged</div>
                  <div style={{ fontSize: '16px', fontWeight: 600, marginTop: '4px', color: 'var(--primary)' }}>
                    ₹{parseFloat(booking.servicePriceSnapshot).toFixed(2)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Date & Slot</div>
                  <div style={{ fontSize: '14px', fontWeight: 500, marginTop: '4px' }}>
                    {new Date(booking.slotDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{booking.slotLabelSnapshot}</div>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Payment Method</div>
                  <div style={{ fontSize: '14px', fontWeight: 500, marginTop: '4px' }}>
                    {booking.paymentMethod === 'CASH_ON_SERVICE' ? 'Cash on Service' : 'Online Payment'}
                  </div>
                </div>
              </div>

              <h3 style={{ fontSize: '18px', fontWeight: 600, margin: '32px 0 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px' }}>
                Customer & Address
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Address Label</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, marginTop: '4px' }}>{booking.addressSnapshot.label}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Full Address</div>
                  <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {booking.addressSnapshot.addressLine1}
                    {booking.addressSnapshot.addressLine2 && `, ${booking.addressSnapshot.addressLine2}`}
                    <br />
                    {booking.addressSnapshot.city} - {booking.addressSnapshot.pincode}
                  </div>
                </div>
              </div>
            </div>

            {/* Transition Timeline */}
            <div className="glass-card" style={{ maxWidth: '100%', padding: '32px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '24px' }}>Status Transition Logs</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative', paddingLeft: '24px', borderLeft: '2px solid rgba(255,255,255,0.08)' }}>
                {history.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No transition logs recorded.</div>
                ) : (
                  history.map((h, i) => (
                    <div key={h.id} style={{ position: 'relative' }}>
                      {/* Timeline Dot */}
                      <span
                        style={{
                          position: 'absolute',
                          left: '-31px',
                          top: '4px',
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          background: i === history.length - 1 ? 'var(--primary)' : 'rgba(255,255,255,0.2)',
                          boxShadow: i === history.length - 1 ? '0 0 8px var(--primary)' : 'none',
                        }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '14px', fontWeight: 600 }}>{h.status}</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {new Date(h.createdAt).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Updated by: {h.actorRole} {h.note ? `— "${h.note}"` : ''}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Panel: Assignment Dropdown & Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="glass-card" style={{ maxWidth: '100%', padding: '32px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px' }}>Provider Assignment</h3>
              
              {booking.providerId && currentProvider ? (
                <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Assigned Provider</div>
                  <div style={{ fontSize: '16px', fontWeight: 600, marginTop: '4px' }}>{currentProvider.displayName}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>Mobile: {currentProvider.mobileNumber}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Service Area: {currentProvider.serviceArea}</div>
                </div>
              ) : booking.providerId ? (
                <div style={{ background: 'rgba(255, 255, 255, 0.05)', borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Assigned Provider ID</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, marginTop: '4px', wordBreak: 'break-all' }}>{booking.providerId}</div>
                </div>
              ) : (
                <div style={{ background: 'rgba(251, 191, 36, 0.08)', border: '1px solid rgba(251, 191, 36, 0.15)', borderRadius: '12px', padding: '16px', marginBottom: '24px', color: '#fbbf24', fontSize: '14px' }}>
                  ⚠️ No provider assigned yet. This booking is currently pending.
                </div>
              )}

              {/* Assignment Form */}
              {['PENDING', 'ASSIGNED'].includes(booking.status) ? (
                <form onSubmit={handleAssignProvider}>
                  <div className="form-group">
                    <label className="form-label">Select Eligible Provider</label>
                    <select
                      value={selectedProvider}
                      onChange={(e) => setSelectedProvider(e.target.value)}
                      disabled={submitting || loading}
                      style={{
                        width: '100%',
                        height: '48px',
                        background: '#0f172a',
                        border: '1px solid #1e293b',
                        borderRadius: '12px',
                        padding: '0 16px',
                        color: '#fff',
                        outline: 'none',
                        fontSize: '15px',
                        opacity: (submitting || loading) ? 0.6 : 1,
                        cursor: (submitting || loading) ? 'not-allowed' : 'pointer',
                      }}
                      required
                    >
                      <option value="">-- Choose Provider --</option>
                      {providers.map((p) => {
                        const categoriesStr = p.categories?.map(c => c.name).join(', ') || 'None';
                        const lastActiveStr = p.lastActiveAt ? new Date(p.lastActiveAt).toLocaleDateString('en-IN') : 'Never';
                        return (
                          <option key={p.id} value={p.id}>
                            {p.displayName} ({p.serviceArea}) - Badges: {categoriesStr} - Active: {lastActiveStr}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {selectedProvider && (() => {
                    const prov = providers.find(p => p.id === selectedProvider);
                    if (!prov) return null;
                    return (
                      <div style={{ marginTop: '16px', marginBottom: '16px', padding: '16px', background: 'rgba(255, 255, 255, 0.04)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                        <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '8px' }}>Selected Provider Details</div>
                        <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>Name: {prov.displayName}</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Category Badges:</span>
                          {prov.categories?.map(c => (
                            <span key={c.id} style={{ fontSize: '11px', background: 'var(--primary)', color: '#000', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                              {c.name}
                            </span>
                          ))}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          Last Active Date: {prov.lastActiveAt ? new Date(prov.lastActiveAt).toLocaleDateString('en-IN') : 'Never'}
                        </div>
                      </div>
                    );
                  })()}

                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={submitting || !selectedProvider}
                    style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  >
                    {submitting ? (
                      <>
                        <span
                          style={{
                            width: '14px',
                            height: '14px',
                            border: '2px solid rgba(0,0,0,0.3)',
                            borderTop: '2px solid #000',
                            borderRadius: '50%',
                            animation: 'spin 0.8s linear infinite',
                            display: 'inline-block',
                          }}
                        />
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
                <div style={{ padding: '12px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', marginBottom: '24px' }}>
                  Assignment locked. Booking status is in progress or resolved.
                </div>
              )}
 
              {/* Cancel Button */}
              {['PENDING', 'ASSIGNED'].includes(booking.status) && (
                <button
                  type="button"
                  onClick={handleCancelBooking}
                  disabled={submitting}
                  style={{
                    width: '100%',
                    height: '48px',
                    background: 'transparent',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '12px',
                    color: '#f87171',
                    fontSize: '15px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  Cancel Booking
                </button>
              )}
            </div>
          </div>
 
        </div>
      </main>

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
  );
}
