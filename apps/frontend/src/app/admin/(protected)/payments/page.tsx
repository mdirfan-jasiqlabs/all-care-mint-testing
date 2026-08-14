'use client';

import React, { useState, useEffect } from 'react';
import {
  WalletCards,
  Download,
  CreditCard,
  ShieldCheck,
  Calendar,
  RotateCcw,
  Receipt,
  Wallet,
  Banknote,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
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

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const getCustomerAvatarColor = (name: string) => {
  const palette = [
    { bg: 'var(--admin-badge-active-bg)', border: 'var(--admin-badge-active-border)', color: 'var(--admin-badge-active-text)' },
    { bg: 'var(--admin-badge-assigned-bg)', border: 'var(--admin-badge-assigned-border)', color: 'var(--admin-badge-assigned-text)' },
    { bg: 'var(--admin-badge-pending-bg)', border: 'var(--admin-badge-pending-border)', color: 'var(--admin-badge-pending-text)' },
    { bg: 'var(--admin-badge-purple-bg)', border: 'var(--admin-badge-purple-border)', color: 'var(--admin-badge-purple-text)' },
    { bg: 'var(--admin-badge-teal-bg)', border: 'var(--admin-badge-teal-border)', color: 'var(--admin-badge-teal-text)' },
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
  const abortControllerRef = React.useRef<AbortController | null>(null);

  const fetchPayments = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setErrorMsg(null);
    try {
      const params = new URLSearchParams();
      if (methodFilter) params.append('method', methodFilter);
      if (statusFilter) params.append('status', statusFilter);
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);
      params.append('page', String(page));
      params.append('page_size', '20');

      const json = await apiClient.get(`/api/v1/admin/payments?${params.toString()}`);
      if (!controller.signal.aborted) {
        if (json.success && json.data) {
          setPayments(json.data.data || []);
          setTotalPages(json.data.meta?.total_pages || 1);
        } else {
          setPayments([]);
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError' || controller.signal.aborted) return;
      console.error('Failed to fetch payments:', err);
      setErrorMsg(err.message || 'Failed to load payments ledger records.');
      addToast(err.message || 'Error loading payment records', 'error');
      setPayments([]);
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [methodFilter, statusFilter, dateFrom, dateTo, page]);

  const handleSettle = async (id: string) => {
    if (settlingId) return; // Prevent duplicate clicks
    setSettlingId(id);
    try {
      const json = await apiClient.patch(`/api/v1/admin/payments/${id}/settle`);
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
      // Fast Instant Path: If payment records are already in memory, trigger instant download (0ms)
      if (payments && payments.length > 0) {
        const headers = ['Date', 'Booking ID', 'Customer Name', 'Service Name', 'Provider Name', 'Amount (INR)', 'Payment Method', 'Status'];
        const csvRows = [headers.join(',')];

        for (const p of payments) {
          let dateStr = '';
          if (p.date) {
            const rawDate = String(p.date).trim();
            if (rawDate.includes('T')) {
              dateStr = rawDate.split('T')[0];
            } else if (rawDate.includes(' ')) {
              dateStr = rawDate.split(' ')[0];
            } else {
              const d = new Date(p.date);
              if (!isNaN(d.getTime())) {
                const yyyy = d.getFullYear();
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const dd = String(d.getDate()).padStart(2, '0');
                dateStr = `${yyyy}-${mm}-${dd}`;
              } else {
                dateStr = rawDate;
              }
            }
          }
          const bId = `"${(p.booking_id || '').replace(/"/g, '""')}"`;
          const custStr = `"${(p.customer_name || 'Customer').replace(/"/g, '""')}"`;
          const svcStr = `"${(p.service_name || 'Service').replace(/"/g, '""')}"`;
          const provStr = `"${(p.provider_name || 'Provider').replace(/"/g, '""')}"`;
          const amount = p.amount_inr || 0;
          const method = `"${(p.payment_method || '').replace(/"/g, '""')}"`;
          const status = `"${(p.status || '').replace(/"/g, '""')}"`;

          csvRows.push(`${dateStr},${bId},${custStr},${svcStr},${provStr},${amount},${method},${status}`);
        }

        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `payments-report-${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        addToast('CSV export downloaded successfully', 'success');
        return;
      }

      const params = new URLSearchParams();
      if (methodFilter) params.append('method', methodFilter);
      if (statusFilter) params.append('status', statusFilter);
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);
      params.append('format', 'csv');

      const res = await apiClient.raw(`/api/v1/admin/payments?${params.toString()}`);

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

  const handleResetFilters = () => {
    setMethodFilter('');
    setStatusFilter('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  // Derivative calculations for KPI metrics based ONLY on existing loaded payments data
  const totalCount = payments.length;
  const totalAmount = payments.reduce((acc, p) => acc + (p.amount_inr || 0), 0);
  const onlinePayments = payments.filter((p) => p.payment_method === 'ONLINE');
  const onlineAmount = onlinePayments.reduce((acc, p) => acc + (p.amount_inr || 0), 0);
  const cashPayments = payments.filter((p) => p.payment_method === 'CASH');
  const cashAmount = cashPayments.reduce((acc, p) => acc + (p.amount_inr || 0), 0);
  const successfulCount = payments.filter(
    (p) => p.status === 'PAYMENT_SUCCESS' || p.status === 'CASH_SETTLED'
  ).length;
  const successRate = totalCount > 0 ? ((successfulCount / totalCount) * 100).toFixed(1) : '100.0';
  const onlinePercentage = totalAmount > 0 ? ((onlineAmount / totalAmount) * 100).toFixed(1) : '0.0';
  const cashPercentage = totalAmount > 0 ? ((cashAmount / totalAmount) * 100).toFixed(1) : '0.0';

  const formatCurrency = (val: number) => inrFormatter.format(val);

  const renderMethodBadge = (method: string) => {
    const isCash = method === 'CASH';
    const bg = isCash ? 'var(--admin-badge-assigned-bg)' : 'var(--admin-badge-purple-bg)';
    const color = isCash ? 'var(--admin-badge-assigned-text)' : 'var(--admin-badge-purple-text)';
    const border = isCash ? 'var(--admin-badge-assigned-border)' : 'var(--admin-badge-purple-border)';
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '3px 8px',
          borderRadius: '9999px',
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '0.2px',
          backgroundColor: bg,
          color,
          border: `1px solid ${border}`,
          whiteSpace: 'nowrap',
        }}
      >
        {isCash ? <Banknote size={11} /> : <CreditCard size={11} />}
        {method}
      </span>
    );
  };

  const renderStatusBadge = (status: string) => {
    let bg = 'var(--admin-surface-hover)';
    let color = 'var(--admin-text-muted)';
    let border = 'var(--admin-border)';

    if (status === 'PAYMENT_SUCCESS') {
      bg = 'var(--admin-badge-active-bg)';
      color = 'var(--admin-badge-active-text)';
      border = 'var(--admin-badge-active-border)';
    } else if (status === 'CASH_PENDING' || status === 'PAYMENT_PENDING') {
      bg = 'var(--admin-badge-pending-bg)';
      color = 'var(--admin-badge-pending-text)';
      border = 'var(--admin-badge-pending-border)';
    } else if (status === 'CASH_SETTLED') {
      bg = 'var(--admin-badge-assigned-bg)';
      color = 'var(--admin-badge-assigned-text)';
      border = 'var(--admin-badge-assigned-border)';
    } else if (status === 'PAYMENT_FAILED') {
      bg = 'var(--admin-badge-inactive-bg)';
      color = 'var(--admin-badge-inactive-text)';
      border = 'var(--admin-badge-inactive-border)';
    } else if (status === 'CANCELLED') {
      bg = 'var(--admin-surface-hover)';
      color = 'var(--admin-text-muted)';
      border = 'var(--admin-border)';
    }

    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '3px 8px',
          borderRadius: '9999px',
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '0.2px',
          backgroundColor: bg,
          color,
          border: `1px solid ${border}`,
          whiteSpace: 'nowrap',
        }}
      >
        <span
          style={{
            width: '5px',
            height: '5px',
            borderRadius: '50%',
            backgroundColor: color,
          }}
        />
        {status}
      </span>
    );
  };

  const isFiltersDirty = Boolean(methodFilter || statusFilter || dateFrom || dateTo);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', color: 'var(--admin-text-primary)' }}>
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                color: '#10b981',
              }}
            >
              <WalletCards size={20} />
            </div>
            <h1 id="admin-payments-heading" style={{ fontSize: '22px', fontWeight: 800, color: 'var(--admin-text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
              Payments & Financial Ledger
            </h1>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--admin-text-secondary)', marginTop: '4px', margin: 0, paddingLeft: '2px' }}>
            Reconcile provider cash collections, audit online Razorpay transactions, and export financial reports.
          </p>
        </div>

        <button
          id="export-csv-btn"
          onClick={handleExportCsv}
          disabled={exporting}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '10px 18px',
            backgroundColor: '#10b981',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '13px',
            borderRadius: '8px',
            border: 'none',
            cursor: exporting ? 'not-allowed' : 'pointer',
            opacity: exporting ? 0.75 : 1,
            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.25)',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap',
          }}
          className="hover:bg-[#34d399] w-full sm:w-auto active:scale-[0.98]"
        >
          {exporting ? <RefreshCw size={15} className="animate-spin" /> : <Download size={15} />}
          {exporting ? 'Exporting...' : 'Export CSV'}
        </button>
      </div>

      {/* 2. Filter Control Surface */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '16px 18px',
          backgroundColor: 'var(--admin-card-bg)',
          borderRadius: '12px',
          border: '1px solid var(--admin-border)',
          alignItems: 'flex-end',
        }}
      >
        {/* Method Filter */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: '1 1 150px', minWidth: '130px' }}>
          <label htmlFor="method-filter-select" style={{ fontSize: '11px', color: 'var(--admin-text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <CreditCard size={12} color="var(--admin-text-muted)" />
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
              backgroundColor: 'var(--admin-input-bg)',
              color: 'var(--admin-text-primary)',
              border: '1px solid var(--admin-input-border)',
              borderRadius: '8px',
              fontSize: '13px',
              height: '40px',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="" style={{ backgroundColor: 'var(--admin-modal-bg)', color: 'var(--admin-text-primary)' }}>All Methods</option>
            <option value="ONLINE" style={{ backgroundColor: 'var(--admin-modal-bg)', color: 'var(--admin-text-primary)' }}>ONLINE</option>
            <option value="CASH" style={{ backgroundColor: 'var(--admin-modal-bg)', color: 'var(--admin-text-primary)' }}>CASH</option>
          </select>
        </div>

        {/* Status Filter */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: '1 1 170px', minWidth: '150px' }}>
          <label htmlFor="status-filter-select" style={{ fontSize: '11px', color: 'var(--admin-text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <ShieldCheck size={12} color="var(--admin-text-muted)" />
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
              backgroundColor: 'var(--admin-input-bg)',
              color: 'var(--admin-text-primary)',
              border: '1px solid var(--admin-input-border)',
              borderRadius: '8px',
              fontSize: '13px',
              height: '40px',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="" style={{ backgroundColor: 'var(--admin-modal-bg)', color: 'var(--admin-text-primary)' }}>All Statuses</option>
            <option value="PAYMENT_SUCCESS" style={{ backgroundColor: 'var(--admin-modal-bg)', color: 'var(--admin-text-primary)' }}>PAYMENT_SUCCESS</option>
            <option value="CASH_PENDING" style={{ backgroundColor: 'var(--admin-modal-bg)', color: 'var(--admin-text-primary)' }}>CASH_PENDING</option>
            <option value="CASH_SETTLED" style={{ backgroundColor: 'var(--admin-modal-bg)', color: 'var(--admin-text-primary)' }}>CASH_SETTLED</option>
            <option value="PAYMENT_FAILED" style={{ backgroundColor: 'var(--admin-modal-bg)', color: 'var(--admin-text-primary)' }}>PAYMENT_FAILED</option>
            <option value="PAYMENT_PENDING" style={{ backgroundColor: 'var(--admin-modal-bg)', color: 'var(--admin-text-primary)' }}>PAYMENT_PENDING</option>
            <option value="CANCELLED" style={{ backgroundColor: 'var(--admin-modal-bg)', color: 'var(--admin-text-primary)' }}>CANCELLED</option>
          </select>
        </div>

        {/* Date From */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: '1 1 140px', minWidth: '130px' }}>
          <label htmlFor="date-from-input" style={{ fontSize: '11px', color: 'var(--admin-text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Calendar size={12} color="var(--admin-text-muted)" />
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
              padding: '7px 10px',
              backgroundColor: 'var(--admin-input-bg)',
              color: 'var(--admin-text-primary)',
              border: '1px solid var(--admin-input-border)',
              borderRadius: '8px',
              fontSize: '13px',
              height: '40px',
              outline: 'none',
            }}
          />
        </div>

        {/* Date To */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: '1 1 140px', minWidth: '130px' }}>
          <label htmlFor="date-to-input" style={{ fontSize: '11px', color: 'var(--admin-text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Calendar size={12} color="var(--admin-text-muted)" />
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
              padding: '7px 10px',
              backgroundColor: 'var(--admin-input-bg)',
              color: 'var(--admin-text-primary)',
              border: '1px solid var(--admin-input-border)',
              borderRadius: '8px',
              fontSize: '13px',
              height: '40px',
              outline: 'none',
            }}
          />
        </div>

        {/* Reset Action */}
        <button
          id="reset-filters-btn"
          onClick={handleResetFilters}
          disabled={!isFiltersDirty}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '8px 14px',
            backgroundColor: 'var(--admin-surface-hover)',
            color: isFiltersDirty ? 'var(--admin-text-primary)' : 'var(--admin-text-muted)',
            border: '1px solid var(--admin-border)',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600,
            height: '40px',
            cursor: isFiltersDirty ? 'pointer' : 'default',
            opacity: isFiltersDirty ? 1 : 0.5,
            transition: 'all 0.15s ease',
          }}
        >
          <RotateCcw size={14} />
          Reset
        </button>
      </div>

      {/* 3. Financial KPI Cards Grid */}
      {loading ? (
        <PaymentsKpiSkeleton />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* KPI 1: Total Transactions */}
          <div
            style={{
              padding: '14px 16px',
              backgroundColor: 'var(--admin-card-bg)',
              borderRadius: '12px',
              border: '1px solid var(--admin-border)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '8px',
              height: '100%',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: 'var(--admin-text-secondary)', fontWeight: 600 }}>Total Transactions</span>
              <div style={{ width: '30px', height: '30px', borderRadius: '7px', backgroundColor: 'var(--admin-badge-purple-bg)', border: '1px solid var(--admin-badge-purple-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--admin-kpi-purple-text)' }}>
                <Receipt size={16} />
              </div>
            </div>
            <div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--admin-text-primary)', letterSpacing: '-0.02em' }}>
                {totalCount}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)', marginTop: '2px', fontWeight: 500 }}>
                Loaded Page Ledger
              </div>
            </div>
          </div>

          {/* KPI 2: Total Amount */}
          <div
            style={{
              padding: '14px 16px',
              backgroundColor: 'var(--admin-card-bg)',
              borderRadius: '12px',
              border: '1px solid var(--admin-border)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '8px',
              height: '100%',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: 'var(--admin-text-secondary)', fontWeight: 600 }}>Total Amount</span>
              <div style={{ width: '30px', height: '30px', borderRadius: '7px', backgroundColor: 'var(--admin-badge-active-bg)', border: '1px solid var(--admin-badge-active-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--admin-accent)' }}>
                <Wallet size={16} />
              </div>
            </div>
            <div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--admin-accent)', letterSpacing: '-0.02em' }} className="truncate font-mono">
                {formatCurrency(totalAmount)}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)', marginTop: '2px', fontWeight: 500 }}>
                Gross Volume
              </div>
            </div>
          </div>

          {/* KPI 3: Online Payments */}
          <div
            style={{
              padding: '14px 16px',
              backgroundColor: 'var(--admin-card-bg)',
              borderRadius: '12px',
              border: '1px solid var(--admin-border)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '8px',
              height: '100%',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: 'var(--admin-text-secondary)', fontWeight: 600 }}>Online Payments</span>
              <div style={{ width: '30px', height: '30px', borderRadius: '7px', backgroundColor: 'var(--admin-badge-assigned-bg)', border: '1px solid var(--admin-badge-assigned-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--admin-kpi-blue-text)' }}>
                <CreditCard size={16} />
              </div>
            </div>
            <div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--admin-text-primary)', letterSpacing: '-0.02em' }} className="truncate font-mono">
                {formatCurrency(onlineAmount)}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)', marginTop: '2px', fontWeight: 500 }}>
                {onlinePercentage}% of Total
              </div>
            </div>
          </div>

          {/* KPI 4: Cash Payments */}
          <div
            style={{
              padding: '14px 16px',
              backgroundColor: 'var(--admin-card-bg)',
              borderRadius: '12px',
              border: '1px solid var(--admin-border)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '8px',
              height: '100%',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: 'var(--admin-text-secondary)', fontWeight: 600 }}>Cash Payments</span>
              <div style={{ width: '30px', height: '30px', borderRadius: '7px', backgroundColor: 'var(--admin-badge-pending-bg)', border: '1px solid var(--admin-badge-pending-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--admin-kpi-amber-text)' }}>
                <Banknote size={16} />
              </div>
            </div>
            <div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--admin-text-primary)', letterSpacing: '-0.02em' }} className="truncate font-mono">
                {formatCurrency(cashAmount)}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)', marginTop: '2px', fontWeight: 500 }}>
                {cashPercentage}% of Total
              </div>
            </div>
          </div>

          {/* KPI 5: Success Rate */}
          <div
            style={{
              padding: '14px 16px',
              backgroundColor: 'var(--admin-card-bg)',
              borderRadius: '12px',
              border: '1px solid var(--admin-border)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '8px',
              height: '100%',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: 'var(--admin-text-secondary)', fontWeight: 600 }}>Success Rate</span>
              <div style={{ width: '30px', height: '30px', borderRadius: '7px', backgroundColor: 'var(--admin-badge-teal-bg)', border: '1px solid var(--admin-badge-teal-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--admin-kpi-teal-text)' }}>
                <ShieldCheck size={16} />
              </div>
            </div>
            <div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--admin-kpi-teal-text)', letterSpacing: '-0.02em' }}>
                {`${successRate}%`}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)', marginTop: '2px', fontWeight: 500 }}>
                Successful Transactions
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Main Ledger Table Card */}
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
        {/* Section Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '14px 18px',
            borderBottom: '1px solid var(--admin-border)',
          }}
        >
          <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--admin-text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            Transactions Ledger
          </h2>
          <span
            style={{
              backgroundColor: 'var(--admin-badge-active-bg)',
              color: 'var(--admin-badge-active-text)',
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '10px',
              border: '1px solid var(--admin-badge-active-border)',
            }}
          >
            {loading ? 'Loading...' : `${payments.length} records`}
          </span>
        </div>

        {/* Error Alert State */}
        {errorMsg && (
          <div
            id="error-payments-state"
            style={{
              padding: '12px 18px',
              backgroundColor: 'rgba(239, 68, 68, 0.08)',
              borderBottom: '1px solid rgba(239, 68, 68, 0.2)',
              color: '#f87171',
              fontSize: '13px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={16} color="#ef4444" />
              <span>{errorMsg}</span>
            </div>
            <button
              onClick={fetchPayments}
              style={{
                padding: '5px 12px',
                backgroundColor: '#ef4444',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <RefreshCw size={13} />
              Retry
            </button>
          </div>
        )}

        {/* Table Content - Clean 100% width fitting on desktop without horizontal scrollbar */}
        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table id="admin-payments-table" style={{ minWidth: '720px', width: '100%', tableLayout: 'auto', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--admin-table-header-bg)', borderBottom: '1px solid var(--admin-border)' }}>
                <th style={{ padding: '8px 10px', fontSize: '10px', color: 'var(--admin-text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>DATE & TIME</th>
                <th style={{ padding: '8px 10px', fontSize: '10px', color: 'var(--admin-text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>BOOKING ID</th>
                <th style={{ padding: '8px 10px', fontSize: '10px', color: 'var(--admin-text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>CUSTOMER</th>
                <th style={{ padding: '8px 10px', fontSize: '10px', color: 'var(--admin-text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>SERVICE</th>
                <th style={{ padding: '8px 10px', fontSize: '10px', color: 'var(--admin-text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>AMOUNT</th>
                <th style={{ padding: '8px 10px', fontSize: '10px', color: 'var(--admin-text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>METHOD</th>
                <th style={{ padding: '8px 10px', fontSize: '10px', color: 'var(--admin-text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>STATUS</th>
                <th style={{ padding: '8px 10px', fontSize: '10px', color: 'var(--admin-text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px', textAlign: 'right', whiteSpace: 'nowrap' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={`sk-row-${idx}`} style={{ borderBottom: '1px solid var(--admin-border-subtle)' }} className="animate-pulse">
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ width: '70px', height: '14px', backgroundColor: 'var(--admin-skeleton-bg)', borderRadius: '4px' }} />
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ width: '90px', height: '20px', backgroundColor: 'var(--admin-badge-sky-bg)', borderRadius: '5px' }} />
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: 'var(--admin-skeleton-bg)' }} />
                        <div style={{ width: '90px', height: '14px', backgroundColor: 'var(--admin-skeleton-bg)', borderRadius: '4px' }} />
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ width: '110px', height: '14px', backgroundColor: 'var(--admin-skeleton-bg)', borderRadius: '4px' }} />
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ width: '90px', height: '14px', backgroundColor: 'var(--admin-skeleton-bg)', borderRadius: '4px' }} />
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ width: '70px', height: '14px', backgroundColor: 'var(--admin-badge-active-bg)', borderRadius: '4px' }} />
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ width: '60px', height: '18px', backgroundColor: 'var(--admin-skeleton-bg)', borderRadius: '6px' }} />
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ width: '75px', height: '20px', backgroundColor: 'var(--admin-skeleton-bg)', borderRadius: '999px' }} />
                    </td>
                  </tr>
                ))
              ) : payments.length === 0 ? (
                <tr>
                  <td id="empty-payments-state" colSpan={8} style={{ padding: '40px 16px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                      <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: 'var(--admin-surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--admin-text-muted)' }}>
                        <Receipt size={22} />
                      </div>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--admin-text-primary)' }}>No transactions found</span>
                      <span style={{ fontSize: '12px', color: 'var(--admin-text-muted)', maxWidth: '340px' }}>
                        No payment records matching the selected filter criteria were found. Try resetting the filters.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                payments.map((row) => {
                  const avatar = getCustomerAvatarColor(row.customer_name);
                  const initials = getInitials(row.customer_name);

                  return (
                    <tr
                      key={row.id}
                      style={{
                        borderBottom: '1px solid var(--admin-border-subtle)',
                        transition: 'background-color 0.15s ease',
                      }}
                      className="hover:bg-[var(--admin-surface-hover)]"
                    >
                      {/* Date */}
                      <td style={{ padding: '8px 10px', fontSize: '11px', color: 'var(--admin-text-secondary)', whiteSpace: 'nowrap' }}>
                        {new Date(row.date).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      {/* Booking ID */}
                      <td style={{ padding: '8px 10px', fontSize: '11px', fontWeight: 700, color: 'var(--admin-badge-sky-text)', fontFamily: 'monospace', letterSpacing: '0.2px', whiteSpace: 'nowrap' }}>
                        {row.booking_id}
                      </td>

                      {/* Customer with Initials Avatar */}
                      <td style={{ padding: '8px 10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                          <div
                            style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              backgroundColor: avatar.bg,
                              border: `1px solid ${avatar.border}`,
                              color: avatar.color,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '9px',
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
                              fontSize: '11px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              maxWidth: '120px',
                            }}
                            title={row.customer_name}
                          >
                            {row.customer_name}
                          </span>
                        </div>
                      </td>

                      {/* Service */}
                      <td style={{ padding: '8px 10px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            color: 'var(--admin-text-secondary)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            display: 'block',
                            maxWidth: '130px',
                          }}
                          title={row.service_name}
                        >
                          {row.service_name}
                        </span>
                      </td>

                      {/* Amount */}
                      <td style={{ padding: '8px 10px', fontSize: '12px', fontWeight: 800, color: 'var(--admin-accent)', whiteSpace: 'nowrap' }} className="font-mono">
                        ₹{row.amount_inr?.toLocaleString()}
                      </td>

                      {/* Method */}
                      <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>{renderMethodBadge(row.payment_method)}</td>

                      {/* Status */}
                      <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>{renderStatusBadge(row.status)}</td>

                      {/* Action */}
                      <td style={{ padding: '10px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {row.status === 'CASH_PENDING' ? (
                          <button
                            id={`settle-btn-${row.id}`}
                            onClick={() => handleSettle(row.id)}
                            disabled={settlingId === row.id}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '5px 10px',
                              backgroundColor: '#2563eb',
                              color: '#ffffff',
                              borderRadius: '6px',
                              border: 'none',
                              fontWeight: 700,
                              fontSize: '11px',
                              cursor: settlingId === row.id ? 'not-allowed' : 'pointer',
                              opacity: settlingId === row.id ? 0.6 : 1,
                              boxShadow: '0 2px 6px rgba(37, 99, 235, 0.3)',
                              transition: 'all 0.15s ease',
                            }}
                            className="hover:bg-[#1d4ed8]"
                          >
                            {settlingId === row.id ? (
                              <RefreshCw size={12} className="animate-spin" />
                            ) : (
                              <CheckCircle2 size={12} />
                            )}
                            {settlingId === row.id ? 'Settling...' : 'Mark Settled'}
                          </button>
                        ) : (
                          <span style={{ fontSize: '12px', color: 'var(--admin-text-muted)', paddingRight: '8px' }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 5. Pagination Bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 18px',
            borderTop: '1px solid var(--admin-border)',
            backgroundColor: 'var(--admin-card-bg)',
          }}
        >
          <span style={{ fontSize: '12px', color: 'var(--admin-text-muted)' }}>
            Page <strong style={{ color: 'var(--admin-text-primary)' }}>{page}</strong> of <strong style={{ color: 'var(--admin-text-primary)' }}>{totalPages}</strong>
          </span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              id="prev-page-btn"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                backgroundColor: 'var(--admin-surface-hover)',
                border: '1px solid var(--admin-border)',
                color: page <= 1 ? 'var(--admin-text-muted)' : 'var(--admin-text-primary)',
                borderRadius: '6px',
                padding: '5px 10px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: page <= 1 ? 'not-allowed' : 'pointer',
                opacity: page <= 1 ? 0.4 : 1,
                transition: 'all 0.15s ease',
              }}
            >
              <ChevronLeft size={12} />
              Previous
            </button>
            <button
              id="next-page-btn"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
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
                opacity: page >= totalPages ? 0.4 : 1,
                transition: 'all 0.15s ease',
              }}
            >
              Next
              <ChevronRight size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PaymentsKpiSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 w-full" aria-busy="true" aria-label="Loading financial summary statistics">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          style={{
            padding: '14px 16px',
            backgroundColor: 'var(--admin-card-bg)',
            borderRadius: '12px',
            border: '1px solid var(--admin-border)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '12px',
            minHeight: '90px',
          }}
          className="animate-pulse"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ width: '85px', height: '12px', backgroundColor: 'var(--admin-skeleton-bg)', borderRadius: '4px' }} />
            <div style={{ width: '30px', height: '30px', borderRadius: '7px', backgroundColor: 'var(--admin-skeleton-bg)' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ width: '100px', height: '22px', backgroundColor: 'var(--admin-skeleton-bg)', borderRadius: '4px' }} />
            <div style={{ width: '70px', height: '10px', backgroundColor: 'var(--admin-skeleton-bg)', borderRadius: '4px' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

