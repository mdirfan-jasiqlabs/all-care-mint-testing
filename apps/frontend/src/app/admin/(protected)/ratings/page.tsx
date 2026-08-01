'use client';

import React, { useState, useEffect } from 'react';
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

export default function AdminRatingsPage() {
  const [ratings, setRatings] = useState<RatingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Filters
  const [providerSearch, setProviderSearch] = useState('');
  const [minRatingFilter, setMinRatingFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const { addToast } = useToast();
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

  const fetchRatings = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const token = typeof window !== 'undefined' ? (localStorage.getItem('admin_token') || localStorage.getItem('access_token') || '') : '';
      const params = new URLSearchParams();
      if (providerSearch) params.append('provider_search', providerSearch);
      if (minRatingFilter) params.append('min_rating', minRatingFilter);
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);
      params.append('page', String(page));
      params.append('page_size', '20');

      const res = await fetch(`${API_BASE}/admin/ratings?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          throw new Error('Unauthorized access to admin ratings API');
        }
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson?.error?.message || errJson?.message || `HTTP ${res.status} error fetching ratings`);
      }

      const json = await res.json();
      if (json.success && json.data) {
        setRatings(json.data.data || []);
        setTotalPages(json.data.meta?.total_pages || 1);
      } else {
        setRatings([]);
      }
    } catch (err: any) {
      console.error('Failed to fetch ratings:', err);
      setErrorMsg(err.message || 'Failed to load rating records.');
      addToast(err.message || 'Error loading rating records', 'error');
      setRatings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRatings();
  }, [providerSearch, minRatingFilter, dateFrom, dateTo, page]);

  const renderStars = (score: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span
          key={i}
          style={{
            color: i <= score ? '#f59e0b' : '#334155',
            fontSize: '16px',
            marginRight: '2px',
          }}
        >
          ★
        </span>
      );
    }
    const isLowRating = score <= 2;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <div>{stars}</div>
        <span
          style={{
            fontSize: '12px',
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: '9999px',
            backgroundColor: isLowRating ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
            color: isLowRating ? '#f87171' : '#34d399',
            border: isLowRating ? '1px solid rgba(248, 113, 113, 0.3)' : '1px solid rgba(52, 211, 153, 0.3)',
          }}
        >
          {score}.0
        </span>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 id="admin-ratings-heading" style={{ fontSize: '24px', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
            Provider Ratings & Feedback Ledger
          </h1>
          <p style={{ fontSize: '14px', color: '#94a3b8', marginTop: '4px', margin: 0 }}>
            Audit customer reviews, identify low-rated providers (≤2 stars), and monitor service quality metrics.
          </p>
        </div>
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
          <label htmlFor="provider-search-input" style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
            Search Provider / Customer
          </label>
          <input
            id="provider-search-input"
            type="text"
            placeholder="Search name..."
            value={providerSearch}
            onChange={(e) => {
              setProviderSearch(e.target.value);
              setPage(1);
            }}
            style={{
              padding: '8px 12px',
              backgroundColor: '#020617',
              color: '#f8fafc',
              border: '1px solid #334155',
              borderRadius: '6px',
              fontSize: '14px',
              width: '200px',
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label htmlFor="min-rating-select" style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
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
              backgroundColor: '#020617',
              color: '#f8fafc',
              border: '1px solid #334155',
              borderRadius: '6px',
              fontSize: '14px',
            }}
          >
            <option value="">All Ratings</option>
            <option value="LOW">Low Ratings (1-2 Stars ⚠️)</option>
            <option value="5">5 Stars Only</option>
            <option value="4">4 Stars & Above</option>
            <option value="3">3 Stars & Below</option>
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
            id="error-ratings-state"
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
              onClick={fetchRatings}
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
          <table id="admin-ratings-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#1e293b', borderBottom: '1px solid #334155' }}>
                <th style={{ padding: '14px 16px', fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase' }}>Date</th>
                <th style={{ padding: '14px 16px', fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase' }}>Customer</th>
                <th style={{ padding: '14px 16px', fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase' }}>Provider</th>
                <th style={{ padding: '14px 16px', fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase' }}>Booking ID</th>
                <th style={{ padding: '14px 16px', fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase' }}>Rating</th>
                <th style={{ padding: '14px 16px', fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase' }}>Customer Review / Comment</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                    Loading provider ratings...
                  </td>
                </tr>
              ) : ratings.length === 0 ? (
                <tr>
                  <td id="empty-ratings-state" colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                    No provider ratings found matching the filter criteria.
                  </td>
                </tr>
              ) : (
                ratings.map((row) => (
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
                    <td style={{ padding: '14px 16px', fontSize: '14px', color: '#cbd5e1' }}>
                      {row.customer_name}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: 600, color: '#f8fafc' }}>
                      {row.provider_name}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '14px', fontFamily: 'monospace', color: '#60a5fa' }}>
                      {row.booking_id}
                    </td>
                    <td style={{ padding: '14px 16px' }}>{renderStars(row.rating_score)}</td>
                    <td style={{ padding: '14px 16px', fontSize: '14px', color: '#94a3b8', maxWidth: '300px' }}>
                      {row.review_text || <span style={{ fontStyle: 'italic', color: '#475569' }}>No written review</span>}
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
