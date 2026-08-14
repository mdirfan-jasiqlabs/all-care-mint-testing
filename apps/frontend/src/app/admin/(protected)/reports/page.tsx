'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ChartNoAxesCombined,
  FileChartColumn,
  CalendarDays,
  RotateCcw,
  Download,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Files,
  IndianRupee,
  CalendarCheck2,
  WalletCards,
  BadgeCheck,
  FileSearch,
  TriangleAlert,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';

interface ReportItem {
  date: string;
  booking_id: string;
  booking_reference: string;
  customer_name: string;
  service_name: string;
  amount_inr: number;
  payment_method: string;
  status: string;
}

// Memory caches for customer avatar initials and color generation
const initialsCacheMap = new Map<string, string>();
const avatarColorCacheMap = new Map<string, { bg: string; text: string; border: string }>();

function getInitials(name: string): string {
  const key = name || '';
  if (initialsCacheMap.has(key)) return initialsCacheMap.get(key)!;
  if (!key) return '??';
  const parts = key.trim().split(/\s+/);
  const result = parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : key.slice(0, 2).toUpperCase();
  initialsCacheMap.set(key, result);
  return result;
}

function getAvatarColor(name: string): { bg: string; text: string; border: string } {
  const key = name || '';
  if (avatarColorCacheMap.has(key)) return avatarColorCacheMap.get(key)!;
  const colors = [
    { bg: 'rgba(99, 102, 241, 0.16)', text: '#818cf8', border: 'rgba(129, 140, 248, 0.3)' },
    { bg: 'rgba(168, 85, 247, 0.16)', text: '#c084fc', border: 'rgba(192, 132, 252, 0.3)' },
    { bg: 'rgba(59, 130, 246, 0.16)', text: '#60a5fa', border: 'rgba(96, 165, 250, 0.3)' },
    { bg: 'rgba(20, 184, 166, 0.16)', text: '#2dd4bf', border: 'rgba(45, 212, 191, 0.3)' },
    { bg: 'rgba(245, 158, 11, 0.16)', text: '#fbbf24', border: 'rgba(251, 191, 36, 0.3)' },
  ];
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = key.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  const result = colors[index];
  avatarColorCacheMap.set(key, result);
  return result;
}

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

function formatDateDisplay(dateStr: string): { main: string; sub?: string } {
  if (!dateStr) return { main: '—' };
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      return { main: dateStr };
    }
    const dayMonthYear = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    if (dateStr.includes('T') || dateStr.includes(':')) {
      const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
      return { main: dayMonthYear, sub: time.toLowerCase() };
    }
    return { main: dayMonthYear };
  } catch {
    return { main: dateStr };
  }
}

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  const fromStorage =
    sessionStorage.getItem('access_token') ||
    localStorage.getItem('access_token') ||
    localStorage.getItem('admin_token');
  if (fromStorage) return fromStorage;

  const match = document.cookie.match(/(?:^|; )admin_access_token=([^;]*)/);
  if (match) return decodeURIComponent(match[1]);

  const match2 = document.cookie.match(/(?:^|; )access_token=([^;]*)/);
  if (match2) return decodeURIComponent(match2[1]);

  return null;
}

export default function AdminReportsPage() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const defaultDateFrom = thirtyDaysAgo.toISOString().split('T')[0];
  const defaultDateTo = now.toISOString().split('T')[0];

  const [type, setType] = useState<string>('revenue');
  const [dateFrom, setDateFrom] = useState<string>(defaultDateFrom);
  const [dateTo, setDateTo] = useState<string>(defaultDateTo);
  const [reportData, setReportData] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Search & Sorting state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Pagination state
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  const abortControllerRef = useRef<AbortController | null>(null);

  const validateDates = (from: string, to: string): boolean => {
    const dFrom = new Date(from);
    const dTo = new Date(to);

    if (isNaN(dFrom.getTime()) || isNaN(dTo.getTime())) {
      setErrorMsg('Please select valid start and end dates.');
      return false;
    }
    if (dTo < dFrom) {
      setErrorMsg('End date cannot be earlier than start date.');
      return false;
    }

    const diffDays = Math.ceil((dTo.getTime() - dFrom.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 90) {
      setErrorMsg('Date range cannot exceed 90 days.');
      return false;
    }

    setErrorMsg(null);
    return true;
  };

  const fetchReport = async () => {
    if (!validateDates(dateFrom, dateTo)) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    try {
      const token = getAuthToken();

      const res = await fetch(
        `/api/v1/admin/reports?type=${type}&date_from=${dateFrom}&date_to=${dateTo}&page=${page}&page_size=${pageSize}`,
        {
          headers: { Authorization: token ? `Bearer ${token}` : '' },
          signal: controller.signal,
        },
      );

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.message || 'Failed to fetch report data');
      }

      const json = await res.json();
      const items: ReportItem[] = json.data || [];
      setReportData(items);

      const total = json.total !== undefined ? json.total : json.count !== undefined ? json.count : items.length;
      setTotalRecords(total);

      const calculatedPages = json.total_pages || Math.max(1, Math.ceil(total / pageSize));
      setTotalPages(calculatedPages);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setErrorMsg(err.message || 'Failed to generate report.');
    } finally {
      if (abortControllerRef.current === controller) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchReport();
  }, [type, dateFrom, dateTo, page, pageSize]);

  const handleExportCsv = async () => {
    if (!validateDates(dateFrom, dateTo)) return;

    // Fast Instant Path: If report data is already available in memory, download instantly (0ms)
    if (reportData && reportData.length > 0) {
      try {
        const headers = ['Date', 'Booking Reference ID', 'Customer Name', 'Service Name', 'Amount (INR)', 'Payment Method', 'Status'];
        const csvRows = [headers.join(',')];

        for (const item of reportData) {
          let dateStr = '';
          if (item.date) {
            const rawDate = String(item.date).trim();
            if (rawDate.includes('T')) {
              dateStr = rawDate.split('T')[0];
            } else if (rawDate.includes(' ')) {
              dateStr = rawDate.split(' ')[0];
            } else {
              const d = new Date(item.date);
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
          const refStr = `"${(item.booking_reference || item.booking_id || '').replace(/"/g, '""')}"`;
          const custStr = `"${(item.customer_name || 'Customer').replace(/"/g, '""')}"`;
          const svcStr = `"${(item.service_name || 'Service').replace(/"/g, '""')}"`;
          const amount = item.amount_inr || 0;
          const method = `"${(item.payment_method || '').replace(/"/g, '""')}"`;
          const status = `"${(item.status || '').replace(/"/g, '""')}"`;

          csvRows.push(`${dateStr},${refStr},${custStr},${svcStr},${amount},${method},${status}`);
        }

        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.setAttribute('download', `report-${type}-${dateFrom}-${dateTo}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
        return;
      } catch (err) {
        console.warn('Fast client-side CSV export fallback triggered', err);
      }
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const token = getAuthToken();

      const res = await fetch(
        `/api/v1/admin/reports?type=${type}&format=csv&date_from=${dateFrom}&date_to=${dateTo}`,
        {
          headers: { Authorization: token ? `Bearer ${token}` : '' },
        },
      );

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.message || 'Failed to export CSV file.');
      }

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', `report-${type}-${dateFrom}-${dateTo}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to export CSV file.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetFilters = () => {
    setType('revenue');
    setDateFrom(defaultDateFrom);
    setDateTo(defaultDateTo);
    setSearchQuery('');
    setSortBy('date');
    setSortOrder('desc');
    setPage(1);
    setErrorMsg(null);
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  // Filter & Sort reportData for high-density tabular view
  const processedData = useMemo(() => {
    let result = [...reportData];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        (item) =>
          (item.booking_reference && item.booking_reference.toLowerCase().includes(query)) ||
          (item.booking_id && item.booking_id.toLowerCase().includes(query)) ||
          (item.customer_name && item.customer_name.toLowerCase().includes(query)) ||
          (item.service_name && item.service_name.toLowerCase().includes(query)) ||
          (item.payment_method && item.payment_method.toLowerCase().includes(query)) ||
          (item.status && item.status.toLowerCase().includes(query)),
      );
    }

    result.sort((a, b) => {
      let valA: any = (a as any)[sortBy] ?? '';
      let valB: any = (b as any)[sortBy] ?? '';

      if (sortBy === 'amount_inr') {
        valA = Number(valA) || 0;
        valB = Number(valB) || 0;
      } else if (sortBy === 'booking_id') {
        valA = a.booking_reference || a.booking_id || '';
        valB = b.booking_reference || b.booking_id || '';
      } else if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = String(valB).toLowerCase();
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [reportData, searchQuery, sortBy, sortOrder]);

  // Derived KPI calculations from real report data
  const kpiMetrics = useMemo(() => {
    const totalCount = totalRecords || reportData.length;
    const totalRev = reportData.reduce((acc, curr) => acc + (Number(curr.amount_inr) || 0), 0);
    const bookingsCount = reportData.length;
    const avgVal = bookingsCount > 0 ? Math.round(totalRev / bookingsCount) : 0;
    const completedCount = reportData.filter((item) => item.status === 'COMPLETED').length;
    const successRate = bookingsCount > 0 ? (completedCount / bookingsCount) * 100 : 0;

    return {
      totalReports: totalCount,
      totalRevenue: totalRev,
      totalBookings: bookingsCount,
      avgOrderValue: avgVal,
      completedBookings: completedCount,
      successRate: successRate,
    };
  }, [reportData, totalRecords]);

  const renderSortIcon = (column: string) => {
    if (sortBy !== column) {
      return <ArrowUpDown className="w-3 h-3 opacity-40 group-hover:opacity-100 transition-opacity ml-1 shrink-0" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-emerald-400 ml-1 shrink-0" />
    ) : (
      <ArrowDown className="w-3 h-3 text-emerald-400 ml-1 shrink-0" />
    );
  };

  const startRecord = (page - 1) * pageSize + 1;
  const endRecord = Math.min(startRecord + processedData.length - 1, totalRecords || processedData.length);

  return (
    <div className="flex flex-col gap-5 text-slate-100 w-full pb-8">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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
              flexShrink: 0,
            }}
          >
            <ChartNoAxesCombined size={20} />
          </div>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#f8fafc', margin: 0, letterSpacing: '-0.02em' }}>
              Operational Analytics & Reports
            </h1>
            <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '2px', margin: 0 }}>
              Generate revenue reports, booking ledgers, and download CSV exports for operator auditing.
            </p>
          </div>
        </div>

        {/* 2. CSV Export Action Button */}
        <button
          onClick={handleExportCsv}
          disabled={loading || !!errorMsg}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '10px 18px',
            backgroundColor: loading || !!errorMsg ? '#334155' : '#10b981',
            color: '#020617',
            fontWeight: 700,
            fontSize: '13px',
            borderRadius: '8px',
            border: 'none',
            cursor: loading || !!errorMsg ? 'not-allowed' : 'pointer',
            opacity: loading || !!errorMsg ? 0.75 : 1,
            boxShadow: loading || !!errorMsg ? 'none' : '0 4px 14px rgba(16, 185, 129, 0.25)',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap',
          }}
          className="w-full sm:w-auto hover:bg-[#34d399] active:scale-[0.98]"
        >
          {loading ? <RefreshCw size={15} className="animate-spin" /> : <Download size={15} />}
          <span>Export CSV</span>
        </button>
      </div>

      {/* 3. Analytics Control Panel (Filters) */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '14px',
          padding: '16px 18px',
          backgroundColor: '#090d16',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          alignItems: 'flex-end',
        }}
      >
        {/* Report Type Select */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: '2 1 220px', minWidth: '200px' }}>
          <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <FileChartColumn size={12} color="#10b981" />
            Report Type
          </label>
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(1);
            }}
            style={{
              padding: '8px 12px',
              backgroundColor: '#020617',
              color: '#f8fafc',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '8px',
              fontSize: '13px',
              height: '40px',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="revenue">Revenue & Settlements Report</option>
            <option value="booking">Bookings Ledger Report</option>
          </select>
        </div>

        {/* Start Date */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: '1 1 150px', minWidth: '130px' }}>
          <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <CalendarDays size={12} color="#10b981" />
            Start Date
          </label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
            style={{
              padding: '7px 10px',
              backgroundColor: '#020617',
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

        {/* End Date */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: '1 1 170px', minWidth: '150px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <CalendarDays size={12} color="#10b981" />
              End Date
            </label>
            <span style={{ fontSize: '10px', color: '#64748b' }}>(Max 90 days)</span>
          </div>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
            style={{
              padding: '7px 10px',
              backgroundColor: '#020617',
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

        {/* Reset Filters */}
        <button
          onClick={handleResetFilters}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '8px 14px',
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
            color: '#f8fafc',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600,
            height: '40px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <RotateCcw size={14} />
          Reset
        </button>
      </div>

      {/* Error Alert Box */}
      {errorMsg && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '10px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.28)',
            color: '#f87171',
            fontSize: '13px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <TriangleAlert size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 4. KPI Summary Cards Grid - 5 Cards in Single Row matching Payments/Ratings family */}
      {loading ? (
        <ReportsKpiSkeleton />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* KPI 1: Total Reports */}
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
              <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>Total Reports</span>
              <div style={{ width: '30px', height: '30px', borderRadius: '7px', backgroundColor: 'rgba(59, 130, 246, 0.12)', border: '1px solid rgba(59, 130, 246, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa' }}>
                <Files size={15} />
              </div>
            </div>
            <div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em' }}>
                {kpiMetrics.totalReports.toLocaleString()}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', fontWeight: 500 }}>
                In Selected Range
              </div>
            </div>
          </div>

          {/* KPI 2: Total Revenue */}
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
              <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>Total Revenue</span>
              <div style={{ width: '30px', height: '30px', borderRadius: '7px', backgroundColor: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                <IndianRupee size={15} />
              </div>
            </div>
            <div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#10b981', letterSpacing: '-0.02em' }} className="truncate font-mono">
                {inrFormatter.format(kpiMetrics.totalRevenue)}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', fontWeight: 500 }}>
                In Selected Range
              </div>
            </div>
          </div>

          {/* KPI 3: Total Bookings */}
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
              <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>Total Bookings</span>
              <div style={{ width: '30px', height: '30px', borderRadius: '7px', backgroundColor: 'rgba(168, 85, 247, 0.12)', border: '1px solid rgba(168, 85, 247, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c084fc' }}>
                <CalendarCheck2 size={15} />
              </div>
            </div>
            <div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em' }}>
                {kpiMetrics.totalBookings.toLocaleString()}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', fontWeight: 500 }}>
                In Selected Range
              </div>
            </div>
          </div>

          {/* KPI 4: Avg. Order Value */}
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
              <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>Avg. Order Value</span>
              <div style={{ width: '30px', height: '30px', borderRadius: '7px', backgroundColor: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fbbf24' }}>
                <WalletCards size={15} />
              </div>
            </div>
            <div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em' }} className="truncate font-mono">
                {inrFormatter.format(kpiMetrics.avgOrderValue)}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', fontWeight: 500 }}>
                In Selected Range
              </div>
            </div>
          </div>

          {/* KPI 5: Completed Bookings */}
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
              <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>Completed Bookings</span>
              <div style={{ width: '30px', height: '30px', borderRadius: '7px', backgroundColor: 'rgba(20, 184, 166, 0.12)', border: '1px solid rgba(20, 184, 166, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2dd4bf' }}>
                <BadgeCheck size={15} />
              </div>
            </div>
            <div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#2dd4bf', letterSpacing: '-0.02em' }}>
                {kpiMetrics.completedBookings}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', fontWeight: 500 }}>
                {`${kpiMetrics.successRate.toFixed(1)}% Success Rate`}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Report Ledger Table Container */}
      <div
        style={{
          padding: '18px',
          backgroundColor: '#090d16',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        {/* Ledger Header & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc', margin: 0 }}>Report Results</h2>
            <span
              style={{
                padding: '2px 8px',
                borderRadius: '9999px',
                fontSize: '11px',
                fontWeight: 700,
                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                color: '#10b981',
                border: '1px solid rgba(16, 185, 129, 0.25)',
              }}
            >
              {totalRecords} entries
            </span>
          </div>

          <div className="relative w-full sm:w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by Booking ID, Customer, or Service..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 12px 7px 32px',
                backgroundColor: '#020617',
                color: '#f8fafc',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '8px',
                fontSize: '12px',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Loading / Empty / Table View */}
        {loading ? (
          <ReportsTableSkeleton />
        ) : processedData.length === 0 ? (
          <div style={{ padding: '36px 16px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
              <FileSearch size={20} />
            </div>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc', margin: 0 }}>No report data found</h3>
            <p style={{ fontSize: '12px', color: '#64748b', margin: 0, maxWidth: '360px' }}>
              Try adjusting the selected report type, search query, or date range ({dateFrom} to {dateTo}).
            </p>
            <button
              onClick={handleResetFilters}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                color: '#f8fafc',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                cursor: 'pointer',
              }}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          /* Table Wrapper: NO desktop horizontal scrollbar */
          <div className="w-full overflow-x-auto">
            <table style={{ minWidth: '700px', width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: '#64748b' }}>
                  <th onClick={() => handleSort('date')} style={{ padding: '10px 12px', width: '13%' }} className="cursor-pointer hover:text-slate-200 transition-colors select-none group">
                    <div className="flex items-center">
                      <span>Date</span>
                      {renderSortIcon('date')}
                    </div>
                  </th>
                  <th onClick={() => handleSort('booking_id')} style={{ padding: '10px 12px', width: '15%' }} className="cursor-pointer hover:text-slate-200 transition-colors select-none group">
                    <div className="flex items-center">
                      <span>Booking ID</span>
                      {renderSortIcon('booking_id')}
                    </div>
                  </th>
                  <th onClick={() => handleSort('customer_name')} style={{ padding: '10px 12px', width: '20%' }} className="cursor-pointer hover:text-slate-200 transition-colors select-none group">
                    <div className="flex items-center">
                      <span>Customer</span>
                      {renderSortIcon('customer_name')}
                    </div>
                  </th>
                  <th onClick={() => handleSort('service_name')} style={{ padding: '10px 12px', width: '22%' }} className="cursor-pointer hover:text-slate-200 transition-colors select-none group">
                    <div className="flex items-center">
                      <span>Service</span>
                      {renderSortIcon('service_name')}
                    </div>
                  </th>
                  <th onClick={() => handleSort('amount_inr')} style={{ padding: '10px 12px', width: '11%' }} className="cursor-pointer hover:text-slate-200 transition-colors select-none group">
                    <div className="flex items-center">
                      <span>Amount (INR)</span>
                      {renderSortIcon('amount_inr')}
                    </div>
                  </th>
                  <th onClick={() => handleSort('payment_method')} style={{ padding: '10px 12px', width: '10%' }} className="cursor-pointer hover:text-slate-200 transition-colors select-none group">
                    <div className="flex items-center">
                      <span>Method</span>
                      {renderSortIcon('payment_method')}
                    </div>
                  </th>
                  <th onClick={() => handleSort('status')} style={{ padding: '10px 12px', width: '9%' }} className="cursor-pointer hover:text-slate-200 transition-colors select-none group">
                    <div className="flex items-center">
                      <span>Status</span>
                      {renderSortIcon('status')}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {processedData.map((row, idx) => {
                  const dateInfo = formatDateDisplay(row.date);
                  const avatarColor = getAvatarColor(row.customer_name);
                  const initials = getInitials(row.customer_name);
                  const displayRef = row.booking_reference || (row.booking_id ? row.booking_id.substring(0, 10) : '—');

                  return (
                    <tr
                      key={row.booking_id || idx}
                      style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}
                      className="hover:bg-slate-800/30 transition-colors"
                    >
                      {/* Date */}
                      <td style={{ padding: '10px 12px', color: '#94a3b8' }}>
                        <div className="flex flex-col">
                          <span style={{ fontWeight: 600, color: '#f8fafc' }}>{dateInfo.main}</span>
                          {dateInfo.sub && <span style={{ fontSize: '11px', color: '#64748b' }}>{dateInfo.sub}</span>}
                        </div>
                      </td>

                      {/* Booking ID */}
                      <td style={{ padding: '10px 12px' }}>
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '3px 7px',
                            borderRadius: '5px',
                            backgroundColor: 'rgba(56, 189, 248, 0.12)',
                            color: '#38bdf8',
                            border: '1px solid rgba(56, 189, 248, 0.25)',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {displayRef}
                        </span>
                      </td>

                      {/* Customer */}
                      <td style={{ padding: '10px 12px' }}>
                        <div className="flex items-center gap-2">
                          <div
                            style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              backgroundColor: avatarColor.bg,
                              color: avatarColor.text,
                              border: `1px solid ${avatarColor.border}`,
                              fontSize: '10px',
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            {initials}
                          </div>
                          <span style={{ color: '#f8fafc', fontWeight: 500 }} className="truncate max-w-[130px] sm:max-w-[160px]" title={row.customer_name}>
                            {row.customer_name || 'Customer'}
                          </span>
                        </div>
                      </td>

                      {/* Service */}
                      <td style={{ padding: '10px 12px', color: '#cbd5e1' }}>
                        <span className="truncate block max-w-[140px] sm:max-w-[200px]" title={row.service_name}>
                          {row.service_name || 'Service'}
                        </span>
                      </td>

                      {/* Amount */}
                      <td style={{ padding: '10px 12px', color: '#10b981', fontWeight: 700 }} className="font-mono whitespace-nowrap">
                        {inrFormatter.format(Number(row.amount_inr) || 0)}
                      </td>

                      {/* Method */}
                      <td style={{ padding: '10px 12px' }}>
                        <span
                          style={{
                            padding: '2px 7px',
                            borderRadius: '6px',
                            fontSize: '10px',
                            fontWeight: 700,
                            letterSpacing: '0.3px',
                            textTransform: 'uppercase',
                            backgroundColor:
                              row.payment_method === 'ONLINE'
                                ? 'rgba(59, 130, 246, 0.14)'
                                : row.payment_method === 'WALLET'
                                ? 'rgba(20, 184, 166, 0.14)'
                                : 'rgba(168, 85, 247, 0.14)',
                            color:
                              row.payment_method === 'ONLINE'
                                ? '#60a5fa'
                                : row.payment_method === 'WALLET'
                                ? '#2dd4bf'
                                : '#c084fc',
                            border:
                              row.payment_method === 'ONLINE'
                                ? '1px solid rgba(96, 165, 250, 0.28)'
                                : row.payment_method === 'WALLET'
                                ? '1px solid rgba(45, 212, 191, 0.28)'
                                : '1px solid rgba(192, 132, 252, 0.28)',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {row.payment_method || 'N/A'}
                        </span>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '10px 12px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            fontSize: '11px',
                            fontWeight: 700,
                            backgroundColor:
                              row.status === 'COMPLETED'
                                ? 'rgba(16, 185, 129, 0.14)'
                                : row.status === 'PENDING'
                                ? 'rgba(245, 158, 11, 0.14)'
                                : 'rgba(239, 68, 68, 0.14)',
                            color:
                              row.status === 'COMPLETED'
                                ? '#34d399'
                                : row.status === 'PENDING'
                                ? '#fbbf24'
                                : '#f87171',
                            border:
                              row.status === 'COMPLETED'
                                ? '1px solid rgba(52, 211, 153, 0.28)'
                                : row.status === 'PENDING'
                                ? '1px solid rgba(251, 191, 36, 0.28)'
                                : '1px solid rgba(248, 113, 113, 0.28)',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <span
                            style={{
                              width: '4px',
                              height: '4px',
                              borderRadius: '50%',
                              backgroundColor:
                                row.status === 'COMPLETED'
                                  ? '#34d399'
                                  : row.status === 'PENDING'
                                  ? '#fbbf24'
                                  : '#f87171',
                            }}
                          />
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {processedData.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-white/10 text-xs text-slate-400">
            <div>
              Showing <span className="font-bold text-slate-200">{startRecord}</span> to{' '}
              <span className="font-bold text-slate-200">{endRecord}</span> of{' '}
              <span className="font-bold text-slate-200">{totalRecords}</span> results
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                  color: page <= 1 ? '#64748b' : '#f8fafc',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  cursor: page <= 1 ? 'not-allowed' : 'pointer',
                  opacity: page <= 1 ? 0.5 : 1,
                }}
              >
                <ChevronLeft size={14} />
              </button>

              <span style={{ padding: '4px 10px', borderRadius: '6px', backgroundColor: '#020617', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#f8fafc', fontWeight: 600 }}>
                Page {page} of {totalPages}
              </span>

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                  color: page >= totalPages ? '#64748b' : '#f8fafc',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                  opacity: page >= totalPages ? 0.5 : 1,
                }}
              >
                <ChevronRight size={14} />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                style={{
                  backgroundColor: '#020617',
                  color: '#f8fafc',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '6px',
                  padding: '3px 8px',
                  fontSize: '12px',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Skeleton Component for 5 KPI Summary Cards
function ReportsKpiSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 w-full" aria-busy="true" aria-label="Loading report summary statistics">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          style={{
            padding: '14px 16px',
            backgroundColor: '#090d16',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '12px',
            minHeight: '90px',
          }}
          className="animate-pulse"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ width: '80px', height: '12px', backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: '4px' }} />
            <div style={{ width: '30px', height: '30px', borderRadius: '7px', backgroundColor: 'rgba(255, 255, 255, 0.06)' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ width: '100px', height: '22px', backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: '4px' }} />
            <div style={{ width: '70px', height: '10px', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// Skeleton Component for Reports Table
function ReportsTableSkeleton() {
  return (
    <div className="w-full overflow-x-auto" aria-busy="true" aria-label="Loading reports table data">
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: '#64748b' }}>
            <th style={{ padding: '10px 12px', width: '13%' }}>Date</th>
            <th style={{ padding: '10px 12px', width: '15%' }}>Booking ID</th>
            <th style={{ padding: '10px 12px', width: '20%' }}>Customer</th>
            <th style={{ padding: '10px 12px', width: '22%' }}>Service</th>
            <th style={{ padding: '10px 12px', width: '11%' }}>Amount (INR)</th>
            <th style={{ padding: '10px 12px', width: '10%' }}>Method</th>
            <th style={{ padding: '10px 12px', width: '9%' }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((row) => (
            <tr key={row} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }} className="animate-pulse">
              <td style={{ padding: '12px' }}>
                <div style={{ width: '70px', height: '14px', backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: '4px' }} />
              </td>
              <td style={{ padding: '12px' }}>
                <div style={{ width: '90px', height: '20px', backgroundColor: 'rgba(56, 189, 248, 0.12)', borderRadius: '5px' }} />
              </td>
              <td style={{ padding: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: 'rgba(255, 255, 255, 0.08)' }} />
                  <div style={{ width: '100px', height: '14px', backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: '4px' }} />
                </div>
              </td>
              <td style={{ padding: '12px' }}>
                <div style={{ width: '130px', height: '14px', backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: '4px' }} />
              </td>
              <td style={{ padding: '12px' }}>
                <div style={{ width: '70px', height: '14px', backgroundColor: 'rgba(16, 185, 129, 0.12)', borderRadius: '4px' }} />
              </td>
              <td style={{ padding: '12px' }}>
                <div style={{ width: '60px', height: '18px', backgroundColor: 'rgba(255, 255, 255, 0.06)', borderRadius: '6px' }} />
              </td>
              <td style={{ padding: '12px' }}>
                <div style={{ width: '75px', height: '20px', backgroundColor: 'rgba(255, 255, 255, 0.06)', borderRadius: '999px' }} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}



