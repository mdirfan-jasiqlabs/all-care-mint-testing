'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Star,
  Search,
  Calendar,
  RotateCcw,
  MessageSquareText,
  MessageSquareOff,
  UsersRound,
  ThumbsUp,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  UserCheck,
  RefreshCw,
  Clock,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useToast } from '../../_components/Toast';

interface RatingRecord {
  id: string;
  date: string;
  booking_id: string;
  customer_name: string;
  provider_name: string;
  rating_score: number;
  review_text: string | null;
}

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

// Hoisted date/time formatters for high performance rendering
const dateObjFormatter = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
const timeObjFormatter = new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

export default function AdminRatingsPage() {
  const [ratings, setRatings] = useState<RatingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Filters & Sorting
  const [providerSearch, setProviderSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [minRatingFilter, setMinRatingFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const { addToast } = useToast();
  const abortControllerRef = useRef<AbortController | null>(null);

  // Debounce search input changes by 300ms to eliminate per-keystroke API spam
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(providerSearch);
    }, 300);
    return () => clearTimeout(handler);
  }, [providerSearch]);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setPage(1);
  };

  const fetchRatings = async () => {
    // Abort pending request if new params triggered
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setErrorMsg(null);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.append('provider_search', debouncedSearch);
      if (minRatingFilter) params.append('min_rating', minRatingFilter);
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);
      if (sortBy) params.append('sort_by', sortBy);
      if (sortOrder) params.append('order', sortOrder);
      params.append('page', String(page));
      params.append('page_size', '20');

      const json = await apiClient.get(`/api/v1/admin/ratings?${params.toString()}`);
      if (!controller.signal.aborted) {
        if (json.success && json.data) {
          setRatings(json.data.data || []);
          setTotalPages(json.data.meta?.total_pages || 1);
          setTotalRecords(json.data.meta?.total || (json.data.data || []).length);
        } else {
          setRatings([]);
          setTotalPages(1);
          setTotalRecords(0);
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError' || controller.signal.aborted) return;
      console.error('Failed to fetch ratings:', err);
      setErrorMsg(err.message || 'Failed to load rating records.');
      addToast(err.message || 'Error loading rating records', 'error');
      setRatings([]);
      setTotalPages(1);
      setTotalRecords(0);
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchRatings();
  }, [debouncedSearch, minRatingFilter, dateFrom, dateTo, page, sortBy, sortOrder]);

  const handleResetFilters = () => {
    setProviderSearch('');
    setDebouncedSearch('');
    setMinRatingFilter('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const isFiltersDirty = Boolean(providerSearch || minRatingFilter || dateFrom || dateTo);

  // Derivations for summary cards memoized for clean rendering
  const { avgPageRating, fiveStarCount, lowRatingCount, commentsCount } = useMemo(() => {
    const sum = ratings.reduce((acc, r) => acc + (r.rating_score || 0), 0);
    const avg = ratings.length > 0 ? (sum / ratings.length).toFixed(1) : '0.0';
    const fiveStar = ratings.filter((r) => r.rating_score === 5).length;
    const low = ratings.filter((r) => r.rating_score <= 2).length;
    const comments = ratings.filter((r) => Boolean(r.review_text && r.review_text.trim())).length;
    return { avgPageRating: avg, fiveStarCount: fiveStar, lowRatingCount: low, commentsCount: comments };
  }, [ratings]);

  const renderStars = (score: number) => {
    const isLowRating = score <= 2;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              size={14}
              style={{
                fill: star <= score ? '#f59e0b' : '#1e293b',
                color: star <= score ? '#f59e0b' : '#334155',
              }}
            />
          ))}
        </div>
        <span
          style={{
            fontSize: '11px',
            fontWeight: 700,
            padding: '2px 7px',
            borderRadius: '9999px',
            backgroundColor: isLowRating ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
            color: isLowRating ? '#f87171' : '#34d399',
            border: isLowRating ? '1px solid rgba(248, 113, 113, 0.3)' : '1px solid rgba(52, 211, 153, 0.3)',
            letterSpacing: '0.2px',
          }}
        >
          {score.toFixed(1)}
        </span>
      </div>
    );
  };

  const startRecord = (page - 1) * 20 + 1;
  const endRecord = Math.min(page * 20, totalRecords);

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
              <Star size={20} className="fill-emerald-500/20" />
            </div>
            <h1 id="admin-ratings-heading" style={{ fontSize: '22px', fontWeight: 800, color: 'var(--admin-text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
              Provider Ratings & Feedback Ledger
            </h1>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--admin-text-secondary)', marginTop: '4px', margin: 0, paddingLeft: '2px' }}>
            Audit customer reviews, identify low-rated providers (≤2 stars), and monitor service quality metrics.
          </p>
        </div>
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
        {/* Search Provider / Customer */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: '1 1 200px', minWidth: '180px' }}>
          <label htmlFor="provider-search-input" style={{ fontSize: '11px', color: 'var(--admin-text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Search size={12} color="var(--admin-text-muted)" />
            Search Provider / Customer
          </label>
          <div style={{ position: 'relative', width: '100%' }} className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--admin-text-muted)' }} />
            <input
              id="provider-search-input"
              type="text"
              placeholder="Search provider or customer name..."
              value={providerSearch}
              onChange={(e) => {
                setProviderSearch(e.target.value);
                setPage(1);
              }}
              style={{
                padding: '8px 12px 8px 34px',
                backgroundColor: 'var(--admin-input-bg)',
                color: 'var(--admin-text-primary)',
                border: '1px solid var(--admin-input-border)',
                borderRadius: '8px',
                fontSize: '13px',
                width: '100%',
                height: '40px',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Rating Filter */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: '1 1 170px', minWidth: '160px' }}>
          <label htmlFor="min-rating-select" style={{ fontSize: '11px', color: 'var(--admin-text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Star size={12} color="var(--admin-text-muted)" />
            Filter by Rating
          </label>
          <select
            id="min-rating-select"
            value={minRatingFilter}
            onChange={(e) => {
              setMinRatingFilter(e.target.value);
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
            <option value="" style={{ backgroundColor: 'var(--admin-modal-bg)', color: 'var(--admin-text-primary)' }}>All Ratings</option>
            <option value="LOW" style={{ backgroundColor: 'var(--admin-modal-bg)', color: 'var(--admin-text-primary)' }}>Low Ratings (1-2 Stars ⚠️)</option>
            <option value="5" style={{ backgroundColor: 'var(--admin-modal-bg)', color: 'var(--admin-text-primary)' }}>5 Stars Only</option>
            <option value="4" style={{ backgroundColor: 'var(--admin-modal-bg)', color: 'var(--admin-text-primary)' }}>4 Stars & Above</option>
            <option value="3" style={{ backgroundColor: 'var(--admin-modal-bg)', color: 'var(--admin-text-primary)' }}>3 Stars & Below</option>
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

      {/* 3. Summary Metric Cards Grid */}
      {loading ? (
        <RatingsKpiSkeleton />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* KPI 1: Total Reviews */}
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
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: 'var(--admin-text-secondary)', fontWeight: 600 }}>Total Reviews</span>
              <div style={{ width: '30px', height: '30px', borderRadius: '7px', backgroundColor: 'rgba(168, 85, 247, 0.12)', border: '1px solid rgba(168, 85, 247, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c084fc' }}>
                <UsersRound size={16} />
              </div>
            </div>
            <div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--admin-text-primary)', letterSpacing: '-0.02em' }}>
                {totalRecords}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)', marginTop: '2px', fontWeight: 500 }}>
                Total Ledger Matching
              </div>
            </div>
          </div>

          {/* KPI 2: Average Rating */}
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
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: 'var(--admin-text-secondary)', fontWeight: 600 }}>Average Rating</span>
              <div style={{ width: '30px', height: '30px', borderRadius: '7px', backgroundColor: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34d399' }}>
                <Star size={16} className="fill-emerald-400/30" />
              </div>
            </div>
            <div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--admin-text-primary)', letterSpacing: '-0.02em' }}>
                {`${avgPageRating} / 5`}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)', marginTop: '2px', fontWeight: 500 }}>
                On Current Page
              </div>
            </div>
          </div>

          {/* KPI 3: 5 Star Reviews */}
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
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: 'var(--admin-text-secondary)', fontWeight: 600 }}>5 Star Reviews</span>
              <div style={{ width: '30px', height: '30px', borderRadius: '7px', backgroundColor: 'rgba(59, 130, 246, 0.12)', border: '1px solid rgba(59, 130, 246, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa' }}>
                <ThumbsUp size={16} />
              </div>
            </div>
            <div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--admin-text-primary)', letterSpacing: '-0.02em' }}>
                {`${fiveStarCount} ${ratings.length > 0 ? `(${((fiveStarCount / ratings.length) * 100).toFixed(0)}%)` : ''}`}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)', marginTop: '2px', fontWeight: 500 }}>
                On Current Page
              </div>
            </div>
          </div>

          {/* KPI 4: Low Rated (<=2*) */}
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
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: 'var(--admin-text-secondary)', fontWeight: 600 }}>Low Rated (≤2★)</span>
              <div style={{ width: '30px', height: '30px', borderRadius: '7px', backgroundColor: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f87171' }}>
                <AlertTriangle size={16} />
              </div>
            </div>
            <div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: lowRatingCount > 0 ? '#f87171' : 'var(--admin-text-primary)', letterSpacing: '-0.02em' }}>
                {`${lowRatingCount} ${ratings.length > 0 ? `(${((lowRatingCount / ratings.length) * 100).toFixed(0)}%)` : ''}`}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)', marginTop: '2px', fontWeight: 500 }}>
                {lowRatingCount > 0 ? 'Requires Attention' : 'On Current Page'}
              </div>
            </div>
          </div>

          {/* KPI 5: Total Comments */}
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
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: 'var(--admin-text-secondary)', fontWeight: 600 }}>Total Comments</span>
              <div style={{ width: '30px', height: '30px', borderRadius: '7px', backgroundColor: 'rgba(20, 184, 166, 0.12)', border: '1px solid rgba(20, 184, 166, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2dd4bf' }}>
                <MessageSquareText size={16} />
              </div>
            </div>
            <div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--admin-text-primary)', letterSpacing: '-0.02em' }}>
                {commentsCount}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)', marginTop: '2px', fontWeight: 500 }}>
                Written Feedback on Page
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Main Ratings Table Card */}
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
        {/* Error Alert State */}
        {errorMsg && (
          <div
            id="error-ratings-state"
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
              onClick={fetchRatings}
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

        {/* Table Content */}
        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table id="admin-ratings-table" style={{ width: '100%', minWidth: '700px', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--admin-table-header-bg)', borderBottom: '1px solid var(--admin-border)' }}>
                <th
                  id="th-sort-date"
                  onClick={() => handleSort('date')}
                  style={{
                    padding: '12px 14px',
                    fontSize: '11px',
                    color: sortBy === 'date' ? '#38bdf8' : 'var(--admin-text-muted)',
                    textTransform: 'uppercase',
                    fontWeight: 700,
                    letterSpacing: '0.4px',
                    cursor: 'pointer',
                    userSelect: 'none',
                    whiteSpace: 'nowrap',
                  }}
                  title="Click to sort by date"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Calendar size={13} />
                    <span>DATE & TIME</span>
                    {sortBy === 'date' ? (
                      sortOrder === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />
                    ) : (
                      <ArrowUpDown size={12} className="opacity-40" />
                    )}
                  </div>
                </th>

                <th style={{ padding: '12px 14px', fontSize: '11px', color: 'var(--admin-text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.4px' }}>
                  CUSTOMER
                </th>

                <th style={{ padding: '12px 14px', fontSize: '11px', color: 'var(--admin-text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.4px' }}>
                  PROVIDER
                </th>

                <th style={{ padding: '12px 14px', fontSize: '11px', color: 'var(--admin-text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.4px', whiteSpace: 'nowrap' }}>
                  BOOKING ID
                </th>

                <th
                  id="th-sort-rating"
                  onClick={() => handleSort('rating')}
                  style={{
                    padding: '12px 14px',
                    fontSize: '11px',
                    color: sortBy === 'rating' ? '#38bdf8' : 'var(--admin-text-muted)',
                    textTransform: 'uppercase',
                    fontWeight: 700,
                    letterSpacing: '0.4px',
                    cursor: 'pointer',
                    userSelect: 'none',
                    whiteSpace: 'nowrap',
                  }}
                  title="Click to sort by rating"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Star size={13} />
                    <span>RATING</span>
                    {sortBy === 'rating' ? (
                      sortOrder === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />
                    ) : (
                      <ArrowUpDown size={12} className="opacity-40" />
                    )}
                  </div>
                </th>

                <th style={{ padding: '12px 14px', fontSize: '11px', color: 'var(--admin-text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.4px' }}>
                  CUSTOMER REVIEW / COMMENT
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={`sk-row-${idx}`} style={{ borderBottom: '1px solid var(--admin-border-subtle)' }} className="animate-pulse">
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ width: '80px', height: '14px', backgroundColor: 'var(--admin-skeleton-bg)', borderRadius: '4px' }} />
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ width: '90px', height: '20px', backgroundColor: 'rgba(56, 189, 248, 0.12)', borderRadius: '5px' }} />
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--admin-skeleton-bg)' }} />
                        <div style={{ width: '100px', height: '14px', backgroundColor: 'var(--admin-skeleton-bg)', borderRadius: '4px' }} />
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ width: '110px', height: '14px', backgroundColor: 'var(--admin-skeleton-bg)', borderRadius: '4px' }} />
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ width: '80px', height: '16px', backgroundColor: 'rgba(245, 158, 11, 0.12)', borderRadius: '4px' }} />
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ width: '180px', height: '14px', backgroundColor: 'var(--admin-skeleton-bg)', borderRadius: '4px' }} />
                    </td>
                  </tr>
                ))
              ) : ratings.length === 0 ? (
                <tr>
                  <td id="empty-ratings-state" colSpan={6} style={{ padding: '48px 16px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--admin-surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--admin-text-muted)' }}>
                        <MessageSquareOff size={24} />
                      </div>
                      <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--admin-text-primary)' }}>No ratings or reviews found</span>
                      <span style={{ fontSize: '13px', color: 'var(--admin-text-muted)', maxWidth: '360px' }}>
                        No provider ratings matching the current filter criteria were found. Try resetting the filters.
                      </span>
                      {isFiltersDirty && (
                        <button
                          onClick={handleResetFilters}
                          style={{
                            marginTop: '8px',
                            padding: '8px 16px',
                            backgroundColor: 'var(--admin-surface-hover)',
                            color: 'var(--admin-text-primary)',
                            border: '1px solid var(--admin-border)',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <RotateCcw size={14} />
                          Reset Filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                ratings.map((row) => {
                  const isLow = row.rating_score <= 2;
                  const customerInitials = getInitials(row.customer_name);
                  const custAvatar = getAvatarColor(row.customer_name);
                  const d = new Date(row.date);
                  const dateStr = dateObjFormatter.format(d);
                  const timeStr = timeObjFormatter.format(d);

                  return (
                    <tr
                      key={row.id}
                      style={{
                        borderBottom: '1px solid var(--admin-border-subtle)',
                        backgroundColor: isLow ? 'rgba(239, 68, 68, 0.04)' : 'transparent',
                        borderLeft: isLow ? '3px solid #ef4444' : '3px solid transparent',
                        transition: 'background-color 0.15s ease',
                      }}
                      className="hover:bg-[var(--admin-surface-hover)]"
                    >
                      {/* Date & Time */}
                      <td style={{ padding: '12px 14px', fontSize: '13px', color: 'var(--admin-text-secondary)', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 600, color: 'var(--admin-text-primary)' }}>{dateStr}</div>
                        <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <Clock size={11} />
                          {timeStr}
                        </div>
                      </td>

                      {/* Customer */}
                      <td style={{ padding: '12px 14px', fontSize: '13px', color: 'var(--admin-text-secondary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              backgroundColor: custAvatar.bg,
                              color: custAvatar.text,
                              border: `1px solid ${custAvatar.border}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '11px',
                              fontWeight: 700,
                              flexShrink: 0,
                            }}
                          >
                            {customerInitials}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--admin-text-primary)' }}>{row.customer_name}</div>
                          </div>
                        </div>
                      </td>

                      {/* Provider */}
                      <td style={{ padding: '12px 14px', fontSize: '13px', fontWeight: 600, color: 'var(--admin-text-primary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              backgroundColor: 'rgba(16, 185, 129, 0.14)',
                              color: '#34d399',
                              border: '1px solid rgba(52, 211, 153, 0.28)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            <UserCheck size={14} />
                          </div>
                          <span>{row.provider_name}</span>
                        </div>
                      </td>

                      {/* Booking ID */}
                      <td style={{ padding: '12px 14px', fontSize: '13px', fontFamily: 'monospace', color: '#34d399', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {row.booking_id}
                      </td>

                      {/* Rating */}
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                        {renderStars(row.rating_score)}
                      </td>

                      {/* Customer Review / Comment */}
                      <td style={{ padding: '12px 14px', fontSize: '13px', color: 'var(--admin-text-secondary)', maxWidth: '340px' }}>
                        {row.review_text && row.review_text.trim() ? (
                          <span style={{ color: 'var(--admin-text-primary)', lineHeight: 1.4 }}>{row.review_text}</span>
                        ) : (
                          <span style={{ fontStyle: 'italic', color: 'var(--admin-text-muted)', fontSize: '12px' }}>No written review</span>
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
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 18px',
            backgroundColor: 'var(--admin-card-bg)',
            borderTop: '1px solid var(--admin-border)',
          }}
        >
          <span style={{ fontSize: '13px', color: 'var(--admin-text-muted)', fontWeight: 500 }}>
            {totalRecords > 0 ? (
              <>
                Showing <strong style={{ color: 'var(--admin-text-primary)' }}>{startRecord}</strong> to{' '}
                <strong style={{ color: 'var(--admin-text-primary)' }}>{endRecord}</strong> of{' '}
                <strong style={{ color: 'var(--admin-text-primary)' }}>{totalRecords}</strong> results
              </>
            ) : (
              'Page 1 of 1'
            )}
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              id="prev-page-btn"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 14px',
                backgroundColor: 'var(--admin-surface-hover)',
                color: page <= 1 || loading ? 'var(--admin-text-muted)' : 'var(--admin-text-primary)',
                border: '1px solid var(--admin-border)',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: page <= 1 || loading ? 'not-allowed' : 'pointer',
                opacity: page <= 1 || loading ? 0.4 : 1,
                transition: 'all 0.15s ease',
              }}
            >
              <ChevronLeft size={15} />
              Previous
            </button>

            <span style={{ fontSize: '12px', color: 'var(--admin-text-secondary)', padding: '0 4px', fontWeight: 600 }}>
              {page} / {totalPages}
            </span>

            <button
              id="next-page-btn"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 14px',
                backgroundColor: 'var(--admin-surface-hover)',
                color: page >= totalPages || loading ? 'var(--admin-text-muted)' : 'var(--admin-text-primary)',
                border: '1px solid var(--admin-border)',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: page >= totalPages || loading ? 'not-allowed' : 'pointer',
                opacity: page >= totalPages || loading ? 0.4 : 1,
                transition: 'all 0.15s ease',
              }}
            >
              Next
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RatingsKpiSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 w-full" aria-busy="true" aria-label="Loading rating summary statistics">
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
            <div style={{ width: '80px', height: '12px', backgroundColor: 'var(--admin-skeleton-bg)', borderRadius: '4px' }} />
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

