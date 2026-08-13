'use client';

import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  IndianRupee,
  Calendar,
  CalendarDays,
  UserRoundX,
  UsersRound,
  Star,
  ChevronDown,
  Download,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Minus,
  FileText,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

interface MonthlyTrendItem {
  month: string;
  count: number;
  revenue: number;
}

interface DashboardMetrics {
  total_bookings_today: number;
  revenue_today_inr: number;
  unassigned_count: number;
  active_providers_count: number;
  avg_rating: number;
  monthly_trend?: MonthlyTrendItem[];
  comparison_label?: string;
  revenue_trend_percent?: number | null;
  bookings_trend_percent?: number | null;
  unassigned_trend_percent?: number | null;
}

interface UnassignedBooking {
  id: string;
  bookingReference: string;
  createdAt: string;
  customerName: string;
  serviceName: string;
}

// Helper to generate smooth cubic Bezier path for SVG line charts
function getBezierPath(points: { x: number; y: number }[]) {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const curr = points[i];
    const next = points[i + 1];
    const cp1x = curr.x + (next.x - curr.x) / 2;
    const cp1y = curr.y;
    const cp2x = curr.x + (next.x - curr.x) / 2;
    const cp2y = next.y;
    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${next.x} ${next.y}`;
  }
  return path;
}

// Isolated Memoized SVG Chart Component (prevents hover state from re-rendering full page)
interface DashboardChartProps {
  monthlyTrend?: MonthlyTrendItem[];
  chartYearFilter: string;
  setChartYearFilter: (val: string) => void;
}

const DashboardChart = React.memo(function DashboardChart({
  monthlyTrend,
  chartYearFilter,
  setChartYearFilter,
}: DashboardChartProps) {
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);

  const trendData = useMemo(() => {
    return monthlyTrend && monthlyTrend.length > 0
      ? monthlyTrend.map((t) => ({
          month: t.month,
          count: t.count,
          revenue: t.revenue,
        }))
      : [
          { month: 'Mar', count: 0, revenue: 0 },
          { month: 'Apr', count: 0, revenue: 0 },
          { month: 'May', count: 1360, revenue: 2197534 },
          { month: 'Jun', count: 1650, revenue: 2830112 },
          { month: 'Jul', count: 1715, revenue: 2983013 },
          { month: 'Aug', count: 275, revenue: 479900 },
        ];
  }, [monthlyTrend]);

  // SVG Chart Dimensions & Calculations
  const chartWidth = 700;
  const chartHeight = 240;
  const paddingLeft = 50;
  const paddingRight = 60;
  const paddingTop = 25;
  const paddingBottom = 40;

  const graphW = chartWidth - paddingLeft - paddingRight;
  const graphH = chartHeight - paddingTop - paddingBottom;

  const { pointsBookings, pointsRevenue, pathBookings, pathRevenue, areaBookings, maxBookingsVal, maxRevenueVal } =
    useMemo(() => {
      const maxB = Math.max(...trendData.map((d) => d.count || 0), 3000);
      const maxR = Math.max(...trendData.map((d) => d.revenue || 0), 3600000);

      const ptsB = trendData.map((d, i) => {
        const x = paddingLeft + (i / Math.max(trendData.length - 1, 1)) * graphW;
        const y = paddingTop + graphH - (d.count / maxB) * graphH;
        return { x, y, data: d };
      });

      const ptsR = trendData.map((d, i) => {
        const x = paddingLeft + (i / Math.max(trendData.length - 1, 1)) * graphW;
        const y = paddingTop + graphH - (d.revenue / maxR) * graphH;
        return { x, y, data: d };
      });

      const pB = getBezierPath(ptsB);
      const pR = getBezierPath(ptsR);

      const aB =
        ptsB.length > 0
          ? `${pB} L ${ptsB[ptsB.length - 1].x} ${paddingTop + graphH} L ${ptsB[0].x} ${paddingTop + graphH} Z`
          : '';

      return {
        pointsBookings: ptsB,
        pointsRevenue: ptsR,
        pathBookings: pB,
        pathRevenue: pR,
        areaBookings: aB,
        maxBookingsVal: maxB,
        maxRevenueVal: maxR,
      };
    }, [trendData, graphW, graphH]);

  return (
    <div
      style={{
        backgroundColor: '#090d16',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '12px',
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        position: 'relative',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* Chart Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
          BOOKING VOLUME DISTRIBUTION (MONTHLY)
        </h3>

        <div style={{ position: 'relative' }}>
          <select
            value={chartYearFilter}
            onChange={(e) => setChartYearFilter(e.target.value)}
            style={{
              backgroundColor: '#090d16',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 500,
              padding: '5px 28px 5px 10px',
              color: '#f8fafc',
              cursor: 'pointer',
              outline: 'none',
              appearance: 'none',
              WebkitAppearance: 'none',
            }}
          >
            <option value="this_year">This Year</option>
            <option value="last_year">Last Year</option>
          </select>
          <ChevronDown
            size={13}
            color="#94a3b8"
            style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
          />
        </div>
      </div>

      {/* Chart Legend */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '24px', fontSize: '12px', color: '#cbd5e1' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }} />
          <span style={{ fontWeight: 500 }}>Bookings</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#3b82f6', display: 'inline-block' }} />
          <span style={{ fontWeight: 500 }}>Revenue (₹)</span>
        </div>
      </div>

      {/* Interactive Dual-Series SVG Chart Container */}
      <div style={{ position: 'relative', width: '100%', minHeight: '240px', overflowX: 'auto' }}>
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
        >
          <defs>
            <linearGradient id="bookingsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal Gridlines & Y-Axis Labels */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
            const y = paddingTop + graphH * (1 - ratio);
            const bookingLabel = Math.round(maxBookingsVal * ratio);
            const revenueLabel = Math.round((maxRevenueVal * ratio) / 1000) + 'K';
            const formattedBooking = bookingLabel >= 1000 ? `${(bookingLabel / 1000).toFixed(1).replace('.0', '')}K` : bookingLabel;
            const formattedRevenue = ratio === 0 ? '0' : (maxRevenueVal * ratio >= 1000000 ? `${((maxRevenueVal * ratio) / 1000000).toFixed(1).replace('.0', '')}M` : revenueLabel);

            return (
              <g key={idx}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={chartWidth - paddingRight}
                  y2={y}
                  stroke="rgba(255, 255, 255, 0.05)"
                  strokeDasharray="4 4"
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 4}
                  fill="#64748b"
                  fontSize="10"
                  textAnchor="end"
                  fontFamily="sans-serif"
                >
                  {formattedBooking}
                </text>
                <text
                  x={chartWidth - paddingRight + 8}
                  y={y + 4}
                  fill="#64748b"
                  fontSize="10"
                  textAnchor="start"
                  fontFamily="sans-serif"
                >
                  {formattedRevenue}
                </text>
              </g>
            );
          })}

          {/* Y-Axis Titles */}
          <text x={paddingLeft - 30} y={paddingTop - 10} fill="#64748b" fontSize="10" fontWeight="600">
            Bookings
          </text>
          <text x={chartWidth - paddingRight + 8} y={paddingTop - 10} fill="#64748b" fontSize="10" fontWeight="600">
            Revenue (₹)
          </text>

          {/* Bookings Area Fill */}
          {areaBookings && <path d={areaBookings} fill="url(#bookingsGradient)" />}

          {/* Bookings Bezier Curve Line */}
          {pathBookings && (
            <path d={pathBookings} fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
          )}

          {/* Revenue Bezier Curve Line */}
          {pathRevenue && (
            <path d={pathRevenue} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" />
          )}

          {/* Vertical Guide Line on Hover */}
          {hoveredPointIndex !== null && pointsBookings[hoveredPointIndex] && (
            <line
              x1={pointsBookings[hoveredPointIndex].x}
              y1={paddingTop}
              x2={pointsBookings[hoveredPointIndex].x}
              y2={paddingTop + graphH}
              stroke="rgba(255, 255, 255, 0.2)"
              strokeDasharray="3 3"
            />
          )}

          {/* Data Points & X-Axis Labels */}
          {trendData.map((d, i) => {
            const ptB = pointsBookings[i];
            const ptR = pointsRevenue[i];
            const isHovered = hoveredPointIndex === i;

            if (!ptB || !ptR) return null;

            return (
              <g key={d.month}>
                <text
                  x={ptB.x}
                  y={chartHeight - 10}
                  fill={isHovered ? '#f8fafc' : '#64748b'}
                  fontSize="11"
                  fontWeight={isHovered ? '700' : '500'}
                  textAnchor="middle"
                >
                  {d.month}
                </text>

                <circle
                  cx={ptB.x}
                  cy={ptB.y}
                  r={isHovered ? 5 : 3.5}
                  fill="#10b981"
                  stroke="#090d16"
                  strokeWidth="2"
                  style={{ cursor: 'pointer', transition: 'all 0.15s ease' }}
                />

                <circle
                  cx={ptR.x}
                  cy={ptR.y}
                  r={isHovered ? 5 : 3.5}
                  fill="#3b82f6"
                  stroke="#090d16"
                  strokeWidth="2"
                  style={{ cursor: 'pointer', transition: 'all 0.15s ease' }}
                />

                <rect
                  x={ptB.x - 25}
                  y={paddingTop}
                  width={50}
                  height={graphH}
                  fill="transparent"
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHoveredPointIndex(i)}
                  onMouseLeave={() => setHoveredPointIndex(null)}
                />
              </g>
            );
          })}
        </svg>

        {/* Dark Floating Glassmorphism Tooltip */}
        {hoveredPointIndex !== null && pointsBookings[hoveredPointIndex] && trendData[hoveredPointIndex] && (
          <div
            style={{
              position: 'absolute',
              left: `${(pointsBookings[hoveredPointIndex].x / chartWidth) * 100}%`,
              top: '15%',
              transform: 'translateX(-50%)',
              backgroundColor: '#090d16',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '8px',
              padding: '8px 12px',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.6)',
              pointerEvents: 'none',
              zIndex: 20,
              minWidth: '140px',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#f8fafc', marginBottom: '4px' }}>
              {trendData[hoveredPointIndex].month}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', fontSize: '10px', color: '#cbd5e1', marginBottom: '2px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                <span>Bookings</span>
              </div>
              <span style={{ fontWeight: 700, color: '#10b981' }}>
                {trendData[hoveredPointIndex].count.toLocaleString()}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', fontSize: '10px', color: '#cbd5e1' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#3b82f6' }} />
                <span>Revenue</span>
              </div>
              <span style={{ fontWeight: 700, color: '#60a5fa' }}>
                ₹{trendData[hoveredPointIndex].revenue.toLocaleString()}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

function DashboardSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading dashboard analytics data"
      style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}
    >
      {/* 4 KPI Cards Grid Skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '12px' }}>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              backgroundColor: '#090d16',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '12px 14px',
              height: '120px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              boxSizing: 'border-box',
            }}
          >
            <div className="skeleton-box" style={{ width: '38px', height: '38px', borderRadius: '50%' }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div className="skeleton-box" style={{ width: '100px', height: '20px', borderRadius: '4px' }} />
              <div className="skeleton-box" style={{ width: '80px', height: '12px', borderRadius: '4px' }} />
            </div>
          </div>
        ))}
      </div>

      {/* Chart Skeleton */}
      <div
        style={{
          backgroundColor: '#090d16',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          padding: '16px',
          height: '240px',
        }}
      />
    </div>
  );
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [unassignedBookings, setUnassignedBookings] = useState<UnassignedBooking[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);

  // Date Filter Period state
  const [filterPeriod, setFilterPeriod] = useState<string>('30');
  const [startDate, setStartDate] = useState<string>('2026-07-01');
  const [endDate, setEndDate] = useState<string>('2026-07-23');
  const [dateValidationError, setDateValidationError] = useState<boolean>(false);
  const [isRecalculating, setIsRecalculating] = useState<boolean>(false);

  // Chart year filter state
  const [chartYearFilter, setChartYearFilter] = useState<string>('this_year');

  // CSV Export Toast Banner state
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);
  const [isExportingCsv, setIsExportingCsv] = useState<boolean>(false);

  // Request cancellation & sequence refs
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef<number>(0);

  const fetchDashboardMetrics = useCallback(
    async (
      isManualRetry = false,
      periodOverride?: string,
      customStartOverride?: string,
      customEndOverride?: string,
    ) => {
      if (isManualRetry) {
        setIsRetrying(true);
        if (!metrics) setLoading(true);
      }

      // Abort previous in-flight metrics request if exists
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const currentRequestId = ++requestIdRef.current;

      try {
        const token =
          typeof window !== 'undefined'
            ? sessionStorage.getItem('access_token') ||
              localStorage.getItem('access_token') ||
              localStorage.getItem('admin_token')
            : null;

        if (!token) {
          if (currentRequestId === requestIdRef.current) {
            setLoading(false);
            setIsRetrying(false);
          }
          return;
        }

        const headers = { Authorization: `Bearer ${token}` };
        const activePeriod = periodOverride || filterPeriod;
        const activeStart = customStartOverride !== undefined ? customStartOverride : startDate;
        const activeEnd = customEndOverride !== undefined ? customEndOverride : endDate;

        let queryParams = '';
        if (activePeriod === '7' || activePeriod === '30' || activePeriod === '365') {
          queryParams = `?days=${activePeriod}`;
        } else if (activePeriod === 'custom' && activeStart && activeEnd) {
          queryParams = `?date_from=${activeStart}&date_to=${activeEnd}`;
        }

        const metricsRes = await fetch(`/api/v1/admin/dashboard/metrics${queryParams}`, {
          headers,
          signal: controller.signal,
        });

        // Ignore stale or aborted responses
        if (controller.signal.aborted || currentRequestId !== requestIdRef.current) {
          return;
        }

        if (metricsRes.ok) {
          const data = await metricsRes.json();
          if (currentRequestId === requestIdRef.current && !controller.signal.aborted) {
            setMetrics(data);
            setError(null);
          }
        } else {
          if (currentRequestId === requestIdRef.current && !controller.signal.aborted) {
            setError(`Failed to fetch metrics (HTTP ${metricsRes.status})`);
          }
        }
      } catch (err: any) {
        if (err.name === 'AbortError' || controller.signal.aborted) {
          return; // Ignore aborted request without updating UI state
        }
        if (currentRequestId === requestIdRef.current) {
          setError(err?.message || 'Network error fetching metrics');
        }
      } finally {
        if (currentRequestId === requestIdRef.current) {
          setLoading(false);
          setIsRetrying(false);
          setIsRecalculating(false);
        }
      }
    },
    [filterPeriod, startDate, endDate, metrics],
  );

  const fetchUnassignedBookings = useCallback(async () => {
    try {
      const token =
        typeof window !== 'undefined'
          ? sessionStorage.getItem('access_token') ||
            localStorage.getItem('access_token') ||
            localStorage.getItem('admin_token')
          : null;
      if (!token) return;

      const bookingsRes = await fetch('/api/v1/admin/bookings?status=PENDING&limit=10', {
        headers: { Authorization: `Bearer ${token}` },
      });
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
      }
    } catch (err) {
      console.error('Error loading unassigned bookings:', err);
    }
  }, []);

  const fetchDashboardData = (isManualRetry = false) => {
    fetchDashboardMetrics(isManualRetry);
    fetchUnassignedBookings();
  };

  useEffect(() => {
    fetchDashboardMetrics();
    fetchUnassignedBookings();

    // 60-second auto-refresh
    const interval = setInterval(() => {
      fetchDashboardMetrics();
      fetchUnassignedBookings();
    }, 60000);

    return () => {
      clearInterval(interval);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Filter change handler - ONLY fetches metrics for new date filter
  const handleFilterChange = (newPeriod: string) => {
    setFilterPeriod(newPeriod);
    if (newPeriod === 'custom') {
      validateCustomDates(startDate, endDate);
    } else {
      setDateValidationError(false);
      setIsRecalculating(true);
      fetchDashboardMetrics(false, newPeriod);
    }
  };

  const validateCustomDates = (start: string, end: string) => {
    if (start && end && new Date(start) > new Date(end)) {
      setDateValidationError(true);
    } else {
      setDateValidationError(false);
      setIsRecalculating(true);
      fetchDashboardMetrics(false, 'custom', start, end);
    }
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setStartDate(val);
    validateCustomDates(val, endDate);
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEndDate(val);
    validateCustomDates(startDate, val);
  };

  // CSV Export handler via Bearer header authentication
  const handleExportCsv = async () => {
    setIsExportingCsv(true);
    setBannerMessage('Processing: Streaming SQL joins database queries. Building CSV schema...');

    try {
      const token =
        typeof window !== 'undefined'
          ? sessionStorage.getItem('access_token') ||
            localStorage.getItem('access_token') ||
            localStorage.getItem('admin_token')
          : null;

      const res = await fetch('/api/v1/admin/reports?type=booking&format=csv', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const blob = await res.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.setAttribute('download', `booking-ledger-${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);

        setBannerMessage('Success: Streamed CSV report compiled! Booking ledger file download saved locally.');
      } else {
        setBannerMessage('Error compiling ledger file. Please try again.');
      }
    } catch (err: any) {
      setBannerMessage(`Export Error: ${err.message || 'Failed to generate CSV'}`);
    } finally {
      setIsExportingCsv(false);
      setTimeout(() => setBannerMessage(null), 5000);
    }
  };

  return (
    <div style={{ maxWidth: '100%', width: '100%', display: 'flex', flexDirection: 'column', gap: '16px', color: '#ffffff' }}>
      {/* Toast Notification Banner */}
      {bannerMessage && (
        <div
          id="alert-banner"
          style={{
            padding: '12px 16px',
            backgroundColor: 'rgba(16, 185, 129, 0.12)',
            color: '#10b981',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: 500,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={16} color="#10b981" />
            <span>{bannerMessage}</span>
          </div>
          <button
            onClick={() => setBannerMessage(null)}
            style={{ background: 'transparent', border: 'none', color: '#10b981', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* 1. Page Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
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
            <TrendingUp size={20} />
          </div>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em', margin: 0 }}>
              Operational Analytics
            </h1>
            <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '2px', margin: 0, fontWeight: 400 }}>
              Inspect time-series booking trends, active provider occupancies, and download streamed transactions ledgers.
            </p>
          </div>
        </div>

        {/* Action Button & Date Filter Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={handleExportCsv}
            disabled={isExportingCsv}
            style={{
              backgroundColor: '#10b981',
              color: '#020617',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 14px',
              fontWeight: 700,
              fontSize: '12px',
              cursor: isExportingCsv ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
              opacity: isExportingCsv ? 0.7 : 1,
            }}
            className="hover:bg-[#34d399]"
          >
            <Download size={14} />
            <span>{isExportingCsv ? 'Exporting...' : 'Export Ledger CSV'}</span>
          </button>

          <div style={{ position: 'relative' }}>
            <select
              id="date-filter"
              value={filterPeriod}
              onChange={(e) => handleFilterChange(e.target.value)}
              style={{
                backgroundColor: '#090d16',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 500,
                padding: '7px 28px 7px 12px',
                color: '#f8fafc',
                cursor: 'pointer',
                outline: 'none',
                appearance: 'none',
                WebkitAppearance: 'none',
              }}
            >
              <option value="30">Last 30 Days</option>
              <option value="7">Last 7 Days</option>
              <option value="365">This Year</option>
              <option value="custom">Custom Range</option>
            </select>
            <ChevronDown
              size={14}
              color="#94a3b8"
              style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
            />
          </div>

          {filterPeriod === 'custom' && (
            <div id="custom-date-container" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
              <input
                type="date"
                id="start-date"
                value={startDate}
                onChange={handleStartDateChange}
                style={{
                  backgroundColor: '#090d16',
                  border: dateValidationError ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '6px',
                  padding: '5px 8px',
                  color: '#f8fafc',
                  colorScheme: 'dark',
                  fontSize: '11px',
                  outline: 'none',
                }}
              />
              <span style={{ color: '#64748b' }}>to</span>
              <input
                type="date"
                id="end-date"
                value={endDate}
                onChange={handleEndDateChange}
                style={{
                  backgroundColor: '#090d16',
                  border: dateValidationError ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '6px',
                  padding: '5px 8px',
                  color: '#f8fafc',
                  colorScheme: 'dark',
                  fontSize: '11px',
                  outline: 'none',
                }}
              />
            </div>
          )}
        </div>
      </div>

      {dateValidationError && (
        <p id="date-validation-error" style={{ fontSize: '11px', color: '#f87171', fontWeight: 600, margin: 0, textAlign: 'right' }}>
          Start date must precede End date
        </p>
      )}

      {/* User Error Banner */}
      {error && (
        <div
          id="dashboard-error-banner"
          role="alert"
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '10px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            color: '#fca5a5',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertCircle size={18} color="#f87171" />
            <span style={{ fontSize: '13px' }}>
              {error} {metrics ? '(Preserving last known successful metrics)' : ''}
            </span>
          </div>
          <button
            onClick={() => fetchDashboardData(true)}
            disabled={isRetrying}
            style={{
              background: '#ef4444',
              color: '#ffffff',
              border: 'none',
              padding: '6px 14px',
              borderRadius: '6px',
              fontWeight: 700,
              fontSize: '12px',
              cursor: isRetrying ? 'not-allowed' : 'pointer',
              opacity: isRetrying ? 0.7 : 1,
            }}
          >
            {isRetrying ? 'Retrying...' : 'Retry'}
          </button>
        </div>
      )}

      {/* 2. 4 Equal Height KPI Cards Grid (120px height) */}
      {(loading && !metrics) || isRecalculating ? (
        <DashboardSkeleton />
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '12px', width: '100%' }}>
            {/* KPI 1: Total Revenue */}
            <div
              style={{
                backgroundColor: '#090d16',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '12px 14px',
                height: '120px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                boxSizing: 'border-box',
                minWidth: 0,
                opacity: isRecalculating ? 0.6 : 1,
                transition: 'opacity 0.2s ease',
              }}
            >
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(168, 85, 247, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#c084fc',
                  flexShrink: 0,
                }}
              >
                <IndianRupee size={18} />
              </div>
              <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div id="val-revenue" style={{ fontSize: '22px', fontWeight: 800, color: '#f8fafc', lineHeight: 1.1 }}>
                  {metrics ? `₹${metrics.revenue_today_inr.toLocaleString()}` : '₹0'}
                </div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#e2e8f0', marginTop: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  Total Revenue
                </div>
                {(() => {
                  const label = metrics?.comparison_label || (filterPeriod === '7' ? 'vs prev 7d' : filterPeriod === '30' ? 'vs prev 30d' : filterPeriod === '365' ? 'vs prev yr' : 'vs prev period');
                  const percent = metrics?.revenue_trend_percent;
                  if (percent !== undefined && percent !== null && percent > 0) {
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px', fontSize: '10px', color: '#34d399', fontWeight: 700 }}>
                        <TrendingUp size={11} />
                        <span>+{percent}% {label}</span>
                      </div>
                    );
                  } else if (percent !== undefined && percent !== null && percent < 0) {
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px', fontSize: '10px', color: '#f87171', fontWeight: 700 }}>
                        <TrendingDown size={11} />
                        <span>{percent}% {label}</span>
                      </div>
                    );
                  }
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px', fontSize: '10px', color: '#64748b', fontWeight: 500 }}>
                      <Minus size={11} />
                      <span>0.0% {label}</span>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* KPI 2: Total Bookings */}
            <div
              style={{
                backgroundColor: '#090d16',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '12px 14px',
                height: '120px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                boxSizing: 'border-box',
                minWidth: 0,
                opacity: isRecalculating ? 0.6 : 1,
                transition: 'opacity 0.2s ease',
              }}
            >
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(16, 185, 129, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#10b981',
                  flexShrink: 0,
                }}
              >
                <CalendarDays size={18} />
              </div>
              <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div id="val-bookings" style={{ fontSize: '22px', fontWeight: 800, color: '#f8fafc', lineHeight: 1.1 }}>
                  {metrics ? metrics.total_bookings_today.toLocaleString() : '0'}
                </div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#e2e8f0', marginTop: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  Total Bookings
                </div>
                {(() => {
                  const label = metrics?.comparison_label || (filterPeriod === '7' ? 'vs prev 7d' : filterPeriod === '30' ? 'vs prev 30d' : filterPeriod === '365' ? 'vs prev yr' : 'vs prev period');
                  const percent = metrics?.bookings_trend_percent;
                  if (percent !== undefined && percent !== null && percent > 0) {
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px', fontSize: '10px', color: '#34d399', fontWeight: 700 }}>
                        <TrendingUp size={11} />
                        <span>+{percent}% {label}</span>
                      </div>
                    );
                  } else if (percent !== undefined && percent !== null && percent < 0) {
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px', fontSize: '10px', color: '#f87171', fontWeight: 700 }}>
                        <TrendingDown size={11} />
                        <span>{percent}% {label}</span>
                      </div>
                    );
                  }
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px', fontSize: '10px', color: '#64748b', fontWeight: 500 }}>
                      <Minus size={11} />
                      <span>0.0% {label}</span>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* KPI 3: Unassigned Bookings */}
            <div
              style={{
                backgroundColor: '#090d16',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '12px 14px',
                height: '120px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                boxSizing: 'border-box',
                minWidth: 0,
                opacity: isRecalculating ? 0.6 : 1,
                transition: 'opacity 0.2s ease',
              }}
            >
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(239, 68, 68, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ef4444',
                  flexShrink: 0,
                }}
              >
                <UserRoundX size={18} />
              </div>
              <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div id="val-occupancy" style={{ fontSize: '22px', fontWeight: 800, color: '#f8fafc', lineHeight: 1.1 }}>
                    {metrics ? metrics.unassigned_count : '0'}
                  </div>
                  {metrics && metrics.unassigned_count > 0 && (
                    <span style={{ backgroundColor: 'rgba(239, 68, 68, 0.14)', color: '#f87171', border: '1px solid rgba(248, 113, 113, 0.28)', fontSize: '9px', fontWeight: 800, padding: '1px 6px', borderRadius: '999px', whiteSpace: 'nowrap' }}>
                      Action Required
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#e2e8f0', marginTop: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  Unassigned Bookings
                </div>
                {(() => {
                  const label = metrics?.comparison_label || (filterPeriod === '7' ? 'vs prev 7d' : filterPeriod === '30' ? 'vs prev 30d' : filterPeriod === '365' ? 'vs prev yr' : 'vs prev period');
                  const percent = metrics?.unassigned_trend_percent;
                  if (percent !== undefined && percent !== null && percent > 0) {
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px', fontSize: '10px', color: '#f87171', fontWeight: 700 }}>
                        <TrendingUp size={11} />
                        <span>+{percent}% {label}</span>
                      </div>
                    );
                  } else if (percent !== undefined && percent !== null && percent < 0) {
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px', fontSize: '10px', color: '#34d399', fontWeight: 700 }}>
                        <TrendingDown size={11} />
                        <span>{percent}% {label}</span>
                      </div>
                    );
                  }
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px', fontSize: '10px', color: '#64748b', fontWeight: 500 }}>
                      <Minus size={11} />
                      <span>0.0% {label}</span>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* KPI 4: Active Providers */}
            <div
              style={{
                backgroundColor: '#090d16',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '12px 14px',
                height: '120px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                boxSizing: 'border-box',
                minWidth: 0,
                opacity: isRecalculating ? 0.6 : 1,
                transition: 'opacity 0.2s ease',
              }}
            >
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(59, 130, 246, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#60a5fa',
                  flexShrink: 0,
                }}
              >
                <UsersRound size={18} />
              </div>
              <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div id="val-providers" style={{ fontSize: '22px', fontWeight: 800, color: '#f8fafc', lineHeight: 1.1 }}>
                  {metrics ? metrics.active_providers_count : '0'}
                </div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#e2e8f0', marginTop: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  Active Providers
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px', fontSize: '10px', color: '#64748b', fontWeight: 500 }}>
                  <Minus size={11} />
                  <span>Steady</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Full-Width Dual-Series SVG Chart */}
          <DashboardChart
            monthlyTrend={metrics?.monthly_trend}
            chartYearFilter={chartYearFilter}
            setChartYearFilter={setChartYearFilter}
          />

          {/* 4. Recent Unassigned Bookings Table Card */}
          <div
            style={{
              backgroundColor: '#090d16',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                padding: '14px 16px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                  Recent Unassigned Bookings
                </h2>
                <span
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.12)',
                    color: '#f87171',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '10px',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                  }}
                >
                  {unassignedBookings.length} pending
                </span>
              </div>

              <button
                onClick={() => router.push('/admin/bookings')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#10b981',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
                className="hover:underline"
              >
                <span>View All Bookings</span>
                <ArrowUpRight size={14} />
              </button>
            </div>

            {loading && unassignedBookings.length === 0 ? (
              <div style={{ padding: '24px', color: '#64748b', textAlign: 'center', fontSize: '12px' }}>
                Loading pending bookings...
              </div>
            ) : unassignedBookings.length === 0 ? (
              <div style={{ padding: '24px', color: '#64748b', textAlign: 'center', fontSize: '12px' }}>
                No unassigned bookings requiring immediate dispatch.
              </div>
            ) : (
              <div style={{ overflowX: 'auto', width: '100%' }}>
                <table style={{ width: '100%', tableLayout: 'auto', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                  <thead>
                    <tr
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.02)',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                        color: '#64748b',
                        fontSize: '10px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}
                    >
                      <th style={{ padding: '10px 12px', width: '15%', whiteSpace: 'nowrap' }}>TIME</th>
                      <th style={{ padding: '10px 12px', width: '30%' }}>CUSTOMER</th>
                      <th style={{ padding: '10px 12px', width: '40%' }}>SERVICE</th>
                      <th style={{ padding: '10px 12px', width: '15%', textAlign: 'right', whiteSpace: 'nowrap' }}>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unassignedBookings.map((booking) => (
                      <tr
                        key={booking.id}
                        style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)', transition: 'background-color 0.12s ease' }}
                        className="hover:bg-[rgba(255,255,255,0.02)]"
                      >
                        <td style={{ padding: '10px 12px', color: '#64748b', whiteSpace: 'nowrap' }}>{booking.createdAt}</td>
                        <td style={{ padding: '10px 12px', color: '#f8fafc', fontWeight: 600 }}>
                          <span
                            style={{
                              display: 'block',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              maxWidth: '180px',
                            }}
                            title={booking.customerName}
                          >
                            {booking.customerName}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', color: '#cbd5e1' }}>
                          <span
                            style={{
                              display: 'block',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              maxWidth: '240px',
                            }}
                            title={booking.serviceName}
                          >
                            {booking.serviceName}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <button
                            onClick={() => router.push(`/admin/bookings/${booking.id}`)}
                            style={{
                              backgroundColor: '#10b981',
                              color: '#020617',
                              border: 'none',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontWeight: 700,
                              fontSize: '11px',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                            className="hover:bg-[#34d399]"
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
        </>
      )}
    </div>
  );
}
