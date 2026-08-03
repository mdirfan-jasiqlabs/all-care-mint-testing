'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface DashboardMetrics {
  total_bookings_today: number;
  revenue_today_inr: number;
  unassigned_count: number;
  active_providers_count: number;
  avg_rating: number;
}

interface UnassignedBooking {
  id: string;
  bookingReference: string;
  createdAt: string;
  customerName: string;
  serviceName: string;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [unassignedBookings, setUnassignedBookings] = useState<UnassignedBooking[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);

  const fetchDashboardData = async (isManualRetry = false) => {
    if (isManualRetry) {
      setIsRetrying(true);
      if (!metrics) setLoading(true);
    }

    try {
      const token =
        typeof window !== 'undefined'
          ? sessionStorage.getItem('access_token') ||
            localStorage.getItem('access_token') ||
            localStorage.getItem('admin_token')
          : null;

      if (!token) {
        setLoading(false);
        setIsRetrying(false);
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };
      let fetchFailed = false;
      let errorMessage = '';

      // Fetch 5 KPI metrics
      try {
        const metricsRes = await fetch('/api/v1/admin/dashboard/metrics', { headers });
        if (metricsRes.ok) {
          const data = await metricsRes.json();
          setMetrics(data);
        } else {
          fetchFailed = true;
          errorMessage = `Failed to fetch metrics (HTTP ${metricsRes.status})`;
        }
      } catch (err: any) {
        fetchFailed = true;
        errorMessage = err?.message || 'Network error fetching metrics';
      }

      // Fetch recent unassigned bookings for table
      try {
        const bookingsRes = await fetch('/api/v1/admin/bookings?status=PENDING&limit=10', { headers });
        if (bookingsRes.ok) {
          const json = await bookingsRes.json();
          const items = json.data || json.bookings || [];
          setUnassignedBookings(
            items.map((b: any) => ({
              id: b.id,
              bookingReference: b.bookingReference || b.id.substring(0, 8),
              createdAt: b.createdAt
                ? new Date(b.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : 'Recently',
              customerName: b.customer?.displayName || b.customer?.mobileNumber || 'Customer',
              serviceName: b.serviceNameSnapshot || b.service?.name || 'Service',
            })),
          );
        } else {
          fetchFailed = true;
          if (!errorMessage) {
            errorMessage = `Failed to fetch recent bookings (HTTP ${bookingsRes.status})`;
          }
        }
      } catch (err: any) {
        fetchFailed = true;
        if (!errorMessage) {
          errorMessage = err?.message || 'Network error fetching recent bookings';
        }
      }

      if (fetchFailed) {
        setError(errorMessage || 'Failed to sync latest operational dashboard data');
      } else {
        // Clear error state on clean success
        setError(null);
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError('An unexpected error occurred while loading dashboard metrics.');
    } finally {
      setLoading(false);
      setIsRetrying(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // 60-second auto-refresh
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div>
        <h2 style={{ fontSize: '28px', fontWeight: 600, marginBottom: '8px', color: '#f8fafc' }}>
          Operational Dashboard & Overview
        </h2>
        <p style={{ color: '#64748b' }}>
          Real-time metrics, provider occupancy, and immediate dispatch actions.
        </p>
      </div>

      {/* User-Friendly Error Banner */}
      {error && (
        <div
          id="dashboard-error-banner"
          role="alert"
          style={{
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: '16px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            color: '#fca5a5',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '20px' }}>⚠️</span>
            <div>
              <div style={{ fontWeight: 700, color: '#f87171', fontSize: '14px', marginBottom: '2px' }}>
                Dashboard Data Sync Issue
              </div>
              <div style={{ fontSize: '13px', color: '#cbd5e1' }}>
                {error} {metrics ? '(Preserving last known successful dashboard metrics)' : ''}
              </div>
            </div>
          </div>
          <button
            onClick={() => fetchDashboardData(true)}
            disabled={isRetrying}
            style={{
              background: '#ef4444',
              color: '#ffffff',
              border: 'none',
              padding: '8px 18px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '13px',
              cursor: isRetrying ? 'not-allowed' : 'pointer',
              opacity: isRetrying ? 0.7 : 1,
              whiteSpace: 'nowrap',
            }}
          >
            {isRetrying ? 'Retrying...' : 'Retry'}
          </button>
        </div>
      )}

      {/* 5 KPI Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px',
        }}
      >
        {/* KPI 1: Total Bookings Today */}
        <div
          style={{
            background: 'rgba(30, 41, 59, 0.4)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          }}
        >
          <div style={{ color: '#94a3b8', fontSize: '13px', fontWeight: 500, marginBottom: '8px' }}>
            Bookings Today
          </div>
          {loading && !metrics ? (
            <div style={{ height: '36px', background: '#334155', borderRadius: '8px' }} />
          ) : (
            <div style={{ fontSize: '32px', fontWeight: 700, color: '#10b981' }}>
              {metrics ? metrics.total_bookings_today : '—'}
            </div>
          )}
          <div style={{ color: '#64748b', fontSize: '12px', marginTop: '6px' }}>Live system activity</div>
        </div>

        {/* KPI 2: Revenue Today */}
        <div
          style={{
            background: 'rgba(30, 41, 59, 0.4)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          }}
        >
          <div style={{ color: '#94a3b8', fontSize: '13px', fontWeight: 500, marginBottom: '8px' }}>
            Revenue Today (INR)
          </div>
          {loading && !metrics ? (
            <div style={{ height: '36px', background: '#334155', borderRadius: '8px' }} />
          ) : (
            <div style={{ fontSize: '32px', fontWeight: 700, color: '#38bdf8' }}>
              {metrics ? `₹${metrics.revenue_today_inr.toLocaleString()}` : '—'}
            </div>
          )}
          <div style={{ color: '#64748b', fontSize: '12px', marginTop: '6px' }}>Settled & online capture</div>
        </div>

        {/* KPI 3: Unassigned Bookings */}
        <div
          style={{
            background: 'rgba(30, 41, 59, 0.4)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            position: 'relative',
          }}
        >
          <div style={{ color: '#94a3b8', fontSize: '13px', fontWeight: 500, marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Unassigned Bookings</span>
            {metrics && metrics.unassigned_count > 0 && (
              <span
                style={{
                  background: '#ef4444',
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '999px',
                }}
              >
                Action Required
              </span>
            )}
          </div>
          {loading && !metrics ? (
            <div style={{ height: '36px', background: '#334155', borderRadius: '8px' }} />
          ) : (
            <div
              style={{
                fontSize: '32px',
                fontWeight: 700,
                color: (metrics?.unassigned_count ?? 0) > 0 ? '#f87171' : '#f8fafc',
              }}
            >
              {metrics ? metrics.unassigned_count : '—'}
            </div>
          )}
          <div style={{ color: '#64748b', fontSize: '12px', marginTop: '6px' }}>Awaiting provider allocation</div>
        </div>

        {/* KPI 4: Active Providers */}
        <div
          style={{
            background: 'rgba(30, 41, 59, 0.4)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          }}
        >
          <div style={{ color: '#94a3b8', fontSize: '13px', fontWeight: 500, marginBottom: '8px' }}>
            Active Providers
          </div>
          {loading && !metrics ? (
            <div style={{ height: '36px', background: '#334155', borderRadius: '8px' }} />
          ) : (
            <div style={{ fontSize: '32px', fontWeight: 700, color: '#a855f7' }}>
              {metrics ? metrics.active_providers_count : '—'}
            </div>
          )}
          <div style={{ color: '#64748b', fontSize: '12px', marginTop: '6px' }}>Approved & on-duty fleet</div>
        </div>

        {/* KPI 5: Avg Rating */}
        <div
          style={{
            background: 'rgba(30, 41, 59, 0.4)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          }}
        >
          <div style={{ color: '#94a3b8', fontSize: '13px', fontWeight: 500, marginBottom: '8px' }}>
            Average Rating
          </div>
          {loading && !metrics ? (
            <div style={{ height: '36px', background: '#334155', borderRadius: '8px' }} />
          ) : (
            <div style={{ fontSize: '32px', fontWeight: 700, color: '#fbbf24' }}>
              {metrics ? `★ ${metrics.avg_rating.toFixed(2)}` : '—'}
            </div>
          )}
          <div style={{ color: '#64748b', fontSize: '12px', marginTop: '6px' }}>Platform satisfaction metric</div>
        </div>
      </div>

      {/* Recent Unassigned Bookings Section */}
      <div
        style={{
          background: '#0f172a',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '24px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
          }}
        >
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#f8fafc' }}>
            Recent Unassigned Bookings
          </h3>
          <button
            onClick={() => router.push('/admin/bookings')}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#10b981',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            View All Bookings →
          </button>
        </div>

        {loading && unassignedBookings.length === 0 ? (
          <div style={{ padding: '24px', color: '#64748b', textAlign: 'center' }}>
            Loading pending bookings...
          </div>
        ) : unassignedBookings.length === 0 ? (
          <div style={{ padding: '24px', color: '#64748b', textAlign: 'center' }}>
            No unassigned bookings requiring immediate dispatch.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '14px',
                textAlign: 'left',
              }}
            >
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: '#64748b' }}>
                  <th style={{ padding: '12px 16px' }}>Time</th>
                  <th style={{ padding: '12px 16px' }}>Customer</th>
                  <th style={{ padding: '12px 16px' }}>Service</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {unassignedBookings.map((booking) => (
                  <tr
                    key={booking.id}
                    style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}
                  >
                    <td style={{ padding: '12px 16px', color: '#94a3b8' }}>{booking.createdAt}</td>
                    <td style={{ padding: '12px 16px', color: '#f8fafc', fontWeight: 500 }}>
                      {booking.customerName}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#cbd5e1' }}>{booking.serviceName}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <button
                        onClick={() => router.push(`/admin/bookings/${booking.id}`)}
                        style={{
                          background: '#10b981',
                          color: '#020617',
                          border: 'none',
                          padding: '6px 14px',
                          borderRadius: '8px',
                          fontWeight: 700,
                          fontSize: '12px',
                          cursor: 'pointer',
                        }}
                      >
                        Assign
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
