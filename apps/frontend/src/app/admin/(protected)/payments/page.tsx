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
          backgroundColor: isCash ? 'rgba(59, 130, 246, 0.14)' : 'rgba(168, 85, 247, 0.14)',
          color: isCash ? '#60a5fa' : '#c084fc',
          border: isCash ? '1px solid rgba(96, 165, 250, 0.28)' : '1px solid rgba(192, 132, 252, 0.28)',
          whiteSpace: 'nowrap',
        }}
      >
        {isCash ? <Banknote size={11} /> : <CreditCard size={11} />}
        {method}
      </span>
    );
  };

  const renderStatusBadge = (status: string) => {
    let bg = 'rgba(148, 163, 184, 0.14)';
    let color = '#94a3b8';
    let border = 'rgba(148, 163, 184, 0.28)';

    if (status === 'PAYMENT_SUCCESS') {
      bg = 'rgba(16, 185, 129, 0.14)';
      color = '#34d399';
      border = 'rgba(52, 211, 153, 0.28)';
    } else if (status === 'CASH_PENDING') {
      bg = 'rgba(245, 158, 11, 0.14)';
      color = '#fbbf24';
      border = 'rgba(251, 191, 36, 0.28)';
    } else if (status === 'CASH_SETTLED') {
      bg = 'rgba(100, 116, 139, 0.18)';
      color = '#cbd5e1';
      border = 'rgba(203, 213, 225, 0.28)';
    } else if (status === 'PAYMENT_FAILED') {
      bg = 'rgba(239, 68, 68, 0.14)';
      color = '#f87171';
      border = 'rgba(248, 113, 113, 0.28)';
    } else if (status === 'PAYMENT_PENDING') {
      bg = 'rgba(234, 179, 8, 0.14)';
      color = '#facc15';
      border = 'rgba(250, 204, 21, 0.28)';
    } else if (status === 'CANCELLED') {
      bg = 'rgba(148, 163, 184, 0.14)';
      color = '#94a3b8';
      border = 'rgba(148, 163, 184, 0.28)';
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
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
            <h1 id="admin-payments-heading" style={{ fontSize: '22px', fontWeight: 800, color: '#f8fafc', margin: 0, letterSpacing: '-0.02em' }}>
              Payments & Financial Ledger
            </h1>
          </div>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px', margin: 0, paddingLeft: '2px' }}>
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
            padding: '9px 18px',
            backgroundColor: '#10b981',
            color: '#020617',
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
          className="hover:bg-[#34d399]"
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
          backgroundColor: '#090d16',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          alignItems: 'flex-end',
        }}
      >
        {/* Method Filter */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: '1 1 150px', minWidth: '130px' }}>
          <label htmlFor="method-filter-select" style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <CreditCard size={12} color="#64748b" />
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
              backgroundColor: '#090d16',
              color: '#f8fafc',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '8px',
              fontSize: '13px',
              height: '40px',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="">All Methods</option>
            <option value="ONLINE">ONLINE</option>
            <option value="CASH">CASH</option>
          </select>
        </div>

        {/* Status Filter */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: '1 1 170px', minWidth: '150px' }}>
          <label htmlFor="status-filter-select" style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <ShieldCheck size={12} color="#64748b" />
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
              backgroundColor: '#090d16',
              color: '#f8fafc',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '8px',
              fontSize: '13px',
              height: '40px',
              outline: 'none',
              cursor: 'pointer',
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

        {/* Date From */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: '1 1 140px', minWidth: '130px' }}>
          <label htmlFor="date-from-input" style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Calendar size={12} color="#64748b" />
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
              backgroundColor: '#090d16',
              color: '#f8fafc',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '8px',
              fontSize: '13px',
              height: '40px',
              colorScheme: 'dark',
              outline: 'none',
            }}
          />
        </div>

        {/* Date To */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: '1 1 140px', minWidth: '130px' }}>
          <label htmlFor="date-to-input" style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Calendar size={12} color="#64748b" />
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
              backgroundColor: '#090d16',
              color: '#f8fafc',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '8px',
              fontSize: '13px',
              height: '40px',
              colorScheme: 'dark',
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
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
            color: isFiltersDirty ? '#f8fafc' : '#64748b',
            border: '1px solid rgba(255, 255, 255, 0.12)',
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* KPI 1: Total Transactions */}
        <div
          style={{
            padding: '14px 16px',
            backgroundColor: '#090d16',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '8px',
            height: '100%',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>Total Transactions</span>
            <div style={{ width: '30px', height: '30px', borderRadius: '7px', backgroundColor: 'rgba(168, 85, 247, 0.12)', border: '1px solid rgba(168, 85, 247, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c084fc' }}>
              <Receipt size={16} />
            </div>
          </div>
          <div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em' }}>
              {loading ? '—' : totalCount}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', fontWeight: 500 }}>
              Loaded Page Ledger
            </div>
          </div>
        </div>

        {/* KPI 2: Total Amount */}
        <div
          style={{
            padding: '14px 16px',
            backgroundColor: '#090d16',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '8px',
            height: '100%',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>Total Amount</span>
            <div style={{ width: '30px', height: '30px', borderRadius: '7px', backgroundColor: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34d399' }}>
              <Wallet size={16} />
            </div>
          </div>
          <div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#34d399', letterSpacing: '-0.02em' }} className="truncate font-mono">
              {loading ? '—' : formatCurrency(totalAmount)}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', fontWeight: 500 }}>
              Gross Volume
            </div>
          </div>
        </div>

        {/* KPI 3: Online Payments */}
        <div
          style={{
            padding: '14px 16px',
            backgroundColor: '#090d16',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '8px',
            height: '100%',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>Online Payments</span>
            <div style={{ width: '30px', height: '30px', borderRadius: '7px', backgroundColor: 'rgba(59, 130, 246, 0.12)', border: '1px solid rgba(59, 130, 246, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa' }}>
              <CreditCard size={16} />
            </div>
          </div>
          <div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em' }} className="truncate font-mono">
              {loading ? '—' : formatCurrency(onlineAmount)}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', fontWeight: 500 }}>
              {onlinePercentage}% of Total
            </div>
          </div>
        </div>

        {/* KPI 4: Cash Payments */}
        <div
          style={{
            padding: '14px 16px',
            backgroundColor: '#090d16',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '8px',
            height: '100%',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>Cash Payments</span>
            <div style={{ width: '30px', height: '30px', borderRadius: '7px', backgroundColor: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fbbf24' }}>
              <Banknote size={16} />
            </div>
          </div>
          <div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em' }} className="truncate font-mono">
              {loading ? '—' : formatCurrency(cashAmount)}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', fontWeight: 500 }}>
              {cashPercentage}% of Total
            </div>
          </div>
        </div>

        {/* KPI 5: Success Rate */}
        <div
          style={{
            padding: '14px 16px',
            backgroundColor: '#090d16',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '8px',
            height: '100%',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>Success Rate</span>
            <div style={{ width: '30px', height: '30px', borderRadius: '7px', backgroundColor: 'rgba(20, 184, 166, 0.12)', border: '1px solid rgba(20, 184, 166, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2dd4bf' }}>
              <ShieldCheck size={16} />
            </div>
          </div>
          <div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#2dd4bf', letterSpacing: '-0.02em' }}>
              {loading ? '—' : `${successRate}%`}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', fontWeight: 500 }}>
              Settled & Successful
            </div>
          </div>
        </div>
      </div>

      {/* 4. Main Ledger Table Card */}
      <div
        style={{
          backgroundColor: '#090d16',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
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
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            Transactions Ledger
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
          <table id="admin-payments-table" style={{ width: '100%', tableLayout: 'auto', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <th style={{ padding: '8px 10px', fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>DATE & TIME</th>
                <th style={{ padding: '8px 10px', fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>BOOKING ID</th>
                <th style={{ padding: '8px 10px', fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>CUSTOMER</th>
                <th style={{ padding: '8px 10px', fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>SERVICE</th>
                <th style={{ padding: '8px 10px', fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>AMOUNT</th>
                <th style={{ padding: '8px 10px', fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>METHOD</th>
                <th style={{ padding: '8px 10px', fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>STATUS</th>
                <th style={{ padding: '8px 10px', fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px', textAlign: 'right', whiteSpace: 'nowrap' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={`sk-row-${idx}`} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <td colSpan={8} style={{ padding: '10px' }}>
                      <div
                        style={{
                          height: '18px',
                          backgroundColor: 'rgba(255, 255, 255, 0.06)',
                          borderRadius: '4px',
                          width: '100%',
                          animation: 'pulse 1.5s infinite ease-in-out',
                        }}
                      />
                    </td>
                  </tr>
                ))
              ) : payments.length === 0 ? (
                <tr>
                  <td id="empty-payments-state" colSpan={8} style={{ padding: '40px 16px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                      <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: 'rgba(255, 255, 255, 0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                        <Receipt size={22} />
                      </div>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#f8fafc' }}>No transactions found</span>
                      <span style={{ fontSize: '12px', color: '#64748b', maxWidth: '340px' }}>
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
                        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                        transition: 'background-color 0.15s ease',
                      }}
                      className="hover:bg-[rgba(255,255,255,0.02)]"
                    >
                      {/* Date */}
                      <td style={{ padding: '8px 10px', fontSize: '11px', color: '#cbd5e1', whiteSpace: 'nowrap' }}>
                        {new Date(row.date).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      {/* Booking ID */}
                      <td style={{ padding: '8px 10px', fontSize: '11px', fontWeight: 700, color: '#38bdf8', fontFamily: 'monospace', letterSpacing: '0.2px', whiteSpace: 'nowrap' }}>
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
                              color: '#f8fafc',
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
                            color: '#cbd5e1',
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
                      <td style={{ padding: '8px 10px', fontSize: '12px', fontWeight: 800, color: '#34d399', whiteSpace: 'nowrap' }} className="font-mono">
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
                          <span style={{ fontSize: '12px', color: '#475569', paddingRight: '8px' }}>—</span>
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
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            backgroundColor: 'rgba(255, 255, 255, 0.01)',
          }}
        >
          <span style={{ fontSize: '12px', color: '#64748b' }}>
            Page <strong style={{ color: '#f8fafc' }}>{page}</strong> of <strong style={{ color: '#f8fafc' }}>{totalPages}</strong>
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
                backgroundColor: '#090d16',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: page <= 1 ? '#475569' : '#f8fafc',
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
                backgroundColor: '#090d16',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: page >= totalPages ? '#475569' : '#f8fafc',
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
