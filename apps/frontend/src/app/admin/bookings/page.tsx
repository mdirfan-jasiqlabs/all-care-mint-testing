// ─── apps/frontend/src/app/admin/bookings/page.tsx ───
// Source: DLD Section 8.1 & 6.3 — Admin Booking Overview Page

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

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

export default function AdminBookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(10);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    active: 0,
    completed: 0,
    cancelled: 0,
  });

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('access_token');
      
      let url = `http://localhost:3000/api/v1/admin/bookings?page=${page}&limit=${limit}`;
      if (statusFilter) url += `&status=${statusFilter}`;
      if (dateFilter) url += `&date=${dateFilter}`;

      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token || ''}`,
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

        // Fetch counts for stats (simple local aggregate for demo, or separate calls if needed)
        // Since we are fetching paginated list, we can compute stats or run a separate fetch
        computeStats(data.data, data.total);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch bookings');
    } finally {
      setLoading(false);
    }
  };

  const computeStats = (list: Booking[], totalCount: number) => {
    // Just a basic mock representation of stats for premium look
    setStats({
      total: totalCount,
      pending: list.filter(b => b.status === 'PENDING').length,
      active: list.filter(b => ['ASSIGNED', 'ACCEPTED', 'ON_THE_WAY', 'STARTED'].includes(b.status)).length,
      completed: list.filter(b => b.status === 'COMPLETED').length,
      cancelled: list.filter(b => b.status === 'CANCELLED').length,
    });
  };

  useEffect(() => {
    fetchBookings();
  }, [statusFilter, dateFilter, page]);

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;

    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`http://localhost:3000/api/v1/admin/bookings/${bookingId}/cancel`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`,
        },
        body: JSON.stringify({ reason: 'Admin cancelled from dashboard' }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to cancel booking');
      }

      alert('Booking cancelled successfully.');
      fetchBookings();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Navigation Header */}
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
            <span
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: 'var(--primary)',
                boxShadow: '0 0 10px var(--primary)',
              }}
            ></span>
            <h1 className="title-brand" style={{ fontSize: '20px', letterSpacing: '-0.5px', cursor: 'pointer' }} onClick={() => router.push('/admin/dashboard')}>
              All Care Mint
            </h1>
            <span
              style={{
                fontSize: '11px',
                background: 'rgba(255, 255, 255, 0.08)',
                padding: '2px 8px',
                borderRadius: '20px',
                color: 'var(--text-muted)',
                fontWeight: 600,
                textTransform: 'uppercase',
                marginLeft: '8px',
              }}
            >
              Console
            </span>
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <button
              onClick={() => router.push('/admin/dashboard')}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                fontSize: '14px',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              Dashboard
            </button>
            <button
              onClick={() => router.push('/admin/catalog/categories')}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                fontSize: '14px',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              Catalog
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ flex: 1, maxWidth: '1200px', width: '100%', margin: '0 auto', padding: '40px 24px' }}>
        {/* Breadcrumb & Title */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div>
            <h2 className="title-gradient" style={{ fontSize: '28px', fontWeight: 600, marginBottom: '6px' }}>
              Service Bookings
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
              Monitor, assign providers, reassign, and manage the complete service booking lifecycle.
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '32px',
          }}
        >
          <div style={{ background: 'rgba(30, 41, 59, 0.3)', border: '1px solid var(--card-border)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>Total Bookings</div>
            <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '4px' }}>{total}</div>
          </div>
          <div style={{ background: 'rgba(30, 41, 59, 0.3)', border: '1px solid var(--card-border)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '12px', color: '#fbbf24', fontWeight: 500 }}>Pending Assignment</div>
            <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '4px', color: '#fbbf24' }}>
              {bookings.filter(b => b.status === 'PENDING').length}
            </div>
          </div>
          <div style={{ background: 'rgba(30, 41, 59, 0.3)', border: '1px solid var(--card-border)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 500 }}>Active Jobs</div>
            <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '4px', color: 'var(--primary)' }}>
              {bookings.filter(b => ['ASSIGNED', 'ACCEPTED', 'ON_THE_WAY', 'STARTED'].includes(b.status)).length}
            </div>
          </div>
          <div style={{ background: 'rgba(30, 41, 59, 0.3)', border: '1px solid var(--card-border)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '12px', color: '#10b981', fontWeight: 500 }}>Completed</div>
            <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '4px', color: '#10b981' }}>
              {bookings.filter(b => b.status === 'COMPLETED').length}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div
          className="glass-card"
          style={{
            maxWidth: '100%',
            padding: '20px',
            marginBottom: '24px',
            display: 'flex',
            gap: '16px',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>Filter by Status</label>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              style={{
                background: 'var(--input-bg)',
                border: '1px solid var(--input-border)',
                borderRadius: '8px',
                padding: '8px 12px',
                color: '#fff',
                outline: 'none',
                minWidth: '160px',
              }}
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="ON_THE_WAY">On The Way</option>
              <option value="STARTED">Started</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>Filter by Date</label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => { setDateFilter(e.target.value); setPage(1); }}
              style={{
                background: 'var(--input-bg)',
                border: '1px solid var(--input-border)',
                borderRadius: '8px',
                padding: '7px 12px',
                color: '#fff',
                outline: 'none',
              }}
            />
          </div>

          {(statusFilter || dateFilter) && (
            <button
              onClick={() => { setStatusFilter(''); setDateFilter(''); setPage(1); }}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                padding: '8px 16px',
                color: 'var(--text-muted)',
                fontSize: '13px',
                cursor: 'pointer',
                marginTop: '20px',
              }}
            >
              Clear Filters
            </button>
          )}
        </div>

        {error && <div className="alert-error" style={{ marginBottom: '24px' }}>{error}</div>}

        {/* Bookings Table */}
        <div className="glass-card" style={{ maxWidth: '100%', padding: '24px' }}>
          {loading ? (
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <div className="spinner" style={{ margin: '0 auto' }} />
            </div>
          ) : (
            <>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--card-border)', color: 'var(--text-muted)', fontSize: '13px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '12px' }}>Ref Reference</th>
                    <th style={{ padding: '12px' }}>Service</th>
                    <th style={{ padding: '12px' }}>Date & Time</th>
                    <th style={{ padding: '12px' }}>Payment</th>
                    <th style={{ padding: '12px' }}>Status</th>
                    <th style={{ padding: '12px' }}>Provider</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No bookings found matching filters.
                      </td>
                    </tr>
                  ) : (
                    bookings.map((b) => {
                      // Status colors
                      let statusBg = 'rgba(255,255,255,0.08)';
                      let statusColor = '#fff';
                      if (b.status === 'PENDING') { statusBg = 'rgba(251, 191, 36, 0.15)'; statusColor = '#fbbf24'; }
                      else if (b.status === 'ASSIGNED') { statusBg = 'rgba(59, 130, 246, 0.15)'; statusColor = '#3b82f6'; }
                      else if (b.status === 'ACCEPTED') { statusBg = 'rgba(16, 185, 129, 0.15)'; statusColor = '#10b981'; }
                      else if (b.status === 'COMPLETED') { statusBg = 'rgba(16, 185, 129, 0.2)'; statusColor = '#10b981'; }
                      else if (b.status === 'CANCELLED') { statusBg = 'rgba(239, 68, 68, 0.15)'; statusColor = '#ef4444'; }

                      return (
                        <tr key={b.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '14px' }}>
                          <td style={{ padding: '16px', fontWeight: 600 }}>{b.bookingReference}</td>
                          <td style={{ padding: '16px' }}>
                            <div style={{ fontWeight: 500 }}>{b.serviceNameSnapshot}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>₹{parseFloat(b.servicePriceSnapshot).toFixed(2)}</div>
                          </td>
                          <td style={{ padding: '16px' }}>
                            <div>{new Date(b.slotDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{b.slotLabelSnapshot}</div>
                          </td>
                          <td style={{ padding: '16px', fontSize: '12px', fontWeight: 500 }}>
                            {b.paymentMethod === 'CASH_ON_SERVICE' ? 'Cash' : 'Online'}
                          </td>
                          <td style={{ padding: '16px' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '4px 10px',
                                borderRadius: '12px',
                                fontSize: '12px',
                                fontWeight: 600,
                                background: statusBg,
                                color: statusColor,
                              }}
                            >
                              {b.status}
                            </span>
                          </td>
                          <td style={{ padding: '16px', color: b.providerId ? '#fff' : '#fbbf24', fontSize: '13px' }}>
                            {b.providerId ? (
                              <span style={{ fontSize: '13px', fontWeight: 500 }}>Assigned</span>
                            ) : (
                              'Unassigned'
                            )}
                          </td>
                          <td style={{ padding: '16px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                              <button
                                onClick={() => router.push(`/admin/bookings/${b.id}`)}
                                style={{
                                  background: 'transparent',
                                  border: '1px solid rgba(255,255,255,0.1)',
                                  borderRadius: '8px',
                                  color: '#fff',
                                  padding: '6px 12px',
                                  cursor: 'pointer',
                                  fontSize: '13px',
                                }}
                              >
                                {b.status === 'PENDING' ? 'Assign Provider' : 'View Details'}
                              </button>
                              {['PENDING', 'ASSIGNED'].includes(b.status) && (
                                <button
                                  onClick={() => handleCancelBooking(b.id)}
                                  style={{
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    border: '1px solid rgba(239, 68, 68, 0.2)',
                                    borderRadius: '8px',
                                    color: '#f87171',
                                    padding: '6px 12px',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                  }}
                                >
                                  Cancel
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>

              {/* Pagination */}
              {total > limit && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '24px' }}>
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}
                    style={{
                      background: 'transparent',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: page === 1 ? 'var(--text-muted)' : '#fff',
                      padding: '6px 12px',
                      cursor: page === 1 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Previous
                  </button>
                  <span style={{ alignSelf: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                    Page {page} of {Math.ceil(total / limit)}
                  </span>
                  <button
                    disabled={page >= Math.ceil(total / limit)}
                    onClick={() => setPage(p => p + 1)}
                    style={{
                      background: 'transparent',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: page >= Math.ceil(total / limit) ? 'var(--text-muted)' : '#fff',
                      padding: '6px 12px',
                      cursor: page >= Math.ceil(total / limit) ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
