'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '../../_components/Toast';

interface PaymentRecord {
  id: string;
  date: string;
  booking_id: string;
  customer_name: string;
  service_name: string;
  provider_name: string;
  amount_inr: number;
  payment_method: 'CASH' | 'ONLINE';
  status: 'PAYMENT_PENDING' | 'PAYMENT_SUCCESS' | 'PAYMENT_FAILED' | 'CASH_PENDING' | 'CASH_SETTLED' | 'CANCELLED';
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [methodFilter, setMethodFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [settlingId, setSettlingId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const { addToast } = useToast();
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

  const fetchPayments = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const token = typeof window !== 'undefined' ? (localStorage.getItem('admin_token') || localStorage.getItem('access_token') || '') : '';
      const params = new URLSearchParams();
      if (methodFilter) params.append('method', methodFilter);
      if (statusFilter) params.append('status', statusFilter);
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);
      params.append('page', String(page));
      params.append('page_size', '20');

      const res = await fetch(`${API_BASE}/admin/payments?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          throw new Error('Unauthorized access to admin payments API');
        }
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson?.error?.message || errJson?.message || `HTTP ${res.status} error fetching payments`);
      }

      const json = await res.json();
      if (json.success && json.data) {
        setPayments(json.data.data || []);
        setTotalPages(json.data.meta?.total_pages || 1);
      } else {
        setPayments([]);
      }
    } catch (err: any) {
      console.error('Failed to fetch payments:', err);
      setErrorMsg(err.message || 'Failed to load payments ledger records.');
      addToast(err.message || 'Error loading payment records', 'error');
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [methodFilter, statusFilter, dateFrom, dateTo, page]);

  const handleSettle = async (id: string) => {
    if (settlingId) return; // Prevent duplicate clicks
    setSettlingId(id);
    try {
      const token = typeof window !== 'undefined' ? (localStorage.getItem('admin_token') || localStorage.getItem('access_token') || '') : '';
      const res = await fetch(`${API_BASE}/admin/payments/${id}/settle`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        const errorText = json.error?.message || json.message || `Settlement failed (HTTP ${res.status})`;
        addToast(errorText, 'error');
        return;
      }

      if (json.success) {
        addToast('Cash payment marked as settled', 'success');
        await fetchPayments();
      } else {
        addToast(json.message || 'Settlement request returned unsuccessful', 'error');
      }
    } catch (err: any) {
      console.error('Failed to settle payment:', err);
      addToast(err.message || 'Network error during payment settlement', 'error');
    } finally {
      setSettlingId(null);
    }
  };

  const handleExportCsv = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const token = typeof window !== 'undefined' ? (localStorage.getItem('admin_token') || localStorage.getItem('access_token') || '') : '';
      const params = new URLSearchParams();
      if (methodFilter) params.append('method', methodFilter);
      if (statusFilter) params.append('status', statusFilter);
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);
      params.append('format', 'csv');

      const res = await fetch(`${API_BASE}/admin/payments?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        const msg = errJson?.error?.message || errJson?.message || `CSV export failed (HTTP ${res.status})`;
        addToast(msg, 'error');
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payments-report-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      addToast('CSV export downloaded successfully', 'success');
    } catch (err: any) {
      console.error('Failed to export CSV:', err);
      addToast(err.message || 'Failed to generate CSV export', 'error');
    } finally {
      setExporting(false);
    }
  };

  const renderMethodBadge = (method: string) => {
    const isCash = method === 'CASH';
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '4px 10px',
          borderRadius: '9999px',
          fontSize: '12px',
          fontWeight: 600,
          backgroundColor: isCash ? 'rgba(59, 130, 246, 0.15)' : 'rgba(168, 85, 247, 0.15)',
          color: isCash ? '#60a5fa' : '#c084fc',
          border: isCash ? '1px solid rgba(96, 165, 250, 0.3)' : '1px solid rgba(192, 132, 252, 0.3)',
        }}
      >
        {method}
      </span>
    );
  };

  const renderStatusBadge = (status: string) => {
    let bg = 'rgba(148, 163, 184, 0.15)';
    let color = '#94a3b8';
    let border = 'rgba(148, 163, 184, 0.3)';

    if (status === 'PAYMENT_SUCCESS') {
      bg = 'rgba(16, 185, 129, 0.15)';
      color = '#34d399';
      border = 'rgba(52, 211, 153, 0.3)';
    } else if (status === 'CASH_PENDING') {
      bg = 'rgba(245, 158, 11, 0.15)';
      color = '#fbbf24';
      border = 'rgba(251, 191, 36, 0.3)';
    } else if (status === 'CASH_SETTLED') {
      bg = 'rgba(100, 116, 139, 0.2)';
      color = '#cbd5e1';
      border = 'rgba(203, 213, 225, 0.3)';
    } else if (status === 'PAYMENT_FAILED') {
      bg = 'rgba(239, 68, 68, 0.15)';
      color = '#f87171';
      border = 'rgba(248, 113, 113, 0.3)';
    } else if (status === 'CANCELLED') {
      bg = 'rgba(148, 163, 184, 0.15)';
      color = '#94a3b8';
      border = 'rgba(148, 163, 184, 0.3)';
    }

    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '4px 10px',
          borderRadius: '9999px',
          fontSize: '12px',
          fontWeight: 600,
          backgroundColor: bg,
          color,
          border: `1px solid ${border}`,
        }}
      >
        {status}
      </span>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 id="admin-payments-heading" style={{ fontSize: '24px', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
            Payments & Financial Ledger
          </h1>
          <p style={{ fontSize: '14px', color: '#94a3b8', marginTop: '4px', margin: 0 }}>
            Reconcile provider cash collections, audit online Razorpay transactions, and export reports.
          </p>
        </div>
        <button
          id="export-csv-btn"
          onClick={handleExportCsv}
          disabled={exporting}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            backgroundColor: '#10b981',
            color: '#020617',
            fontWeight: 600,
            fontSize: '14px',
            borderRadius: '8px',
            border: 'none',
            cursor: exporting ? 'not-allowed' : 'pointer',
            opacity: exporting ? 0.7 : 1,
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          {exporting ? 'Exporting...' : 'Export CSV'}
        </button>
      </div>

      {/* Filter Control Toolbar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
          padding: '16px 20px',
          backgroundColor: '#0f172a',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label htmlFor="method-filter-select" style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
            Payment Method
          </label>
          <select
            id="method-filter-select"
            value={methodFilter}
            onChange={(e) => {
              setMethodFilter(e.target.value);
              setPage(1);
            }}
            style={{
              padding: '8px 12px',
              backgroundColor: '#020617',
              color: '#f8fafc',
              border: '1px solid #334155',
              borderRadius: '6px',
              fontSize: '14px',
            }}
          >
            <option value="">All Methods</option>
            <option value="ONLINE">ONLINE</option>
            <option value="CASH">CASH</option>
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label htmlFor="status-filter-select" style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
            Payment Status
          </label>
          <select
            id="status-filter-select"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            style={{
              padding: '8px 12px',
              backgroundColor: '#020617',
              color: '#f8fafc',
              border: '1px solid #334155',
              borderRadius: '6px',
              fontSize: '14px',
            }}
          >
            <option value="">All Statuses</option>
            <option value="PAYMENT_SUCCESS">PAYMENT_SUCCESS</option>
            <option value="CASH_PENDING">CASH_PENDING</option>
            <option value="CASH_SETTLED">CASH_SETTLED</option>
            <option value="PAYMENT_FAILED">PAYMENT_FAILED</option>
            <option value="PAYMENT_PENDING">PAYMENT_PENDING</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label htmlFor="date-from-input" style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
            From Date
          </label>
          <input
            id="date-from-input"
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
            style={{
              padding: '7px 12px',
              backgroundColor: '#020617',
              color: '#f8fafc',
              border: '1px solid #334155',
              borderRadius: '6px',
              fontSize: '14px',
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label htmlFor="date-to-input" style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
            To Date
          </label>
          <input
            id="date-to-input"
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
            style={{
              padding: '7px 12px',
              backgroundColor: '#020617',
              color: '#f8fafc',
              border: '1px solid #334155',
              borderRadius: '6px',
              fontSize: '14px',
            }}
          />
        </div>
      </div>

      {/* Main Table */}
      <div
        style={{
          backgroundColor: '#0f172a',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          overflow: 'hidden',
        }}
      >
        {errorMsg && (
          <div
            id="error-payments-state"
            style={{
              padding: '16px 20px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              borderBottom: '1px solid rgba(239, 68, 68, 0.2)',
              color: '#f87171',
              fontSize: '14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>{errorMsg}</span>
            <button
              onClick={fetchPayments}
              style={{
                padding: '4px 12px',
                backgroundColor: '#ef4444',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              Retry
            </button>
          </div>
        )}

        <div style={{ overflowX: 'auto' }}>
          <table id="admin-payments-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#1e293b', borderBottom: '1px solid #334155' }}>
                <th style={{ padding: '14px 16px', fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase' }}>Date</th>
                <th style={{ padding: '14px 16px', fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase' }}>Booking ID</th>
                <th style={{ padding: '14px 16px', fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase' }}>Customer</th>
                <th style={{ padding: '14px 16px', fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase' }}>Service</th>
                <th style={{ padding: '14px 16px', fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase' }}>Amount</th>
                <th style={{ padding: '14px 16px', fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase' }}>Method</th>
                <th style={{ padding: '14px 16px', fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase' }}>Status</th>
                <th style={{ padding: '14px 16px', fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                    Loading payment records...
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td id="empty-payments-state" colSpan={8} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                    No payment transactions found matching the filter criteria.
                  </td>
                </tr>
              ) : (
                payments.map((row) => (
                  <tr key={row.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <td style={{ padding: '14px 16px', fontSize: '14px', color: '#cbd5e1' }}>
                      {new Date(row.date).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: 600, color: '#f8fafc' }}>
                      {row.booking_id}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '14px', color: '#cbd5e1' }}>
                      {row.customer_name}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '14px', color: '#cbd5e1' }}>
                      {row.service_name}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: 700, color: '#10b981' }}>
                      ₹{row.amount_inr}
                    </td>
                    <td style={{ padding: '14px 16px' }}>{renderMethodBadge(row.payment_method)}</td>
                    <td style={{ padding: '14px 16px' }}>{renderStatusBadge(row.status)}</td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      {row.status === 'CASH_PENDING' ? (
                        <button
                          id={`settle-btn-${row.id}`}
                          onClick={() => handleSettle(row.id)}
                          disabled={settlingId === row.id}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#3b82f6',
                            color: '#ffffff',
                            borderRadius: '6px',
                            border: 'none',
                            fontWeight: 600,
                            fontSize: '12px',
                            cursor: settlingId === row.id ? 'not-allowed' : 'pointer',
                            opacity: settlingId === row.id ? 0.6 : 1,
                          }}
                        >
                          {settlingId === row.id ? 'Settling...' : 'Mark Settled'}
                        </button>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#475569' }}>—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 16px',
            backgroundColor: '#1e293b',
            borderTop: '1px solid #334155',
          }}
        >
          <span style={{ fontSize: '13px', color: '#94a3b8' }}>
            Page {page} of {totalPages}
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              id="prev-page-btn"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              style={{
                padding: '6px 12px',
                backgroundColor: '#0f172a',
                color: '#f8fafc',
                border: '1px solid #334155',
                borderRadius: '6px',
                fontSize: '13px',
                cursor: page <= 1 ? 'not-allowed' : 'pointer',
                opacity: page <= 1 ? 0.4 : 1,
              }}
            >
              Previous
            </button>
            <button
              id="next-page-btn"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              style={{
                padding: '6px 12px',
                backgroundColor: '#0f172a',
                color: '#f8fafc',
                border: '1px solid #334155',
                borderRadius: '6px',
                fontSize: '13px',
                cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                opacity: page >= totalPages ? 0.4 : 1,
              }}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
