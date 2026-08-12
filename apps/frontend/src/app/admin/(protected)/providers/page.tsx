'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo, Suspense } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import { useToast } from '../../_components/Toast';
import TableSkeleton from '../../_components/TableSkeleton';

interface Provider {
  id: string;
  displayName: string;
  mobileNumber: string;
  serviceArea: string;
  status: string;
  categories?: { id: string; name: string }[];
}

interface KpiCounts {
  total: number;
  pending: number;
  approved: number;
  suspended: number;
  rejected: number;
}

function getAvatarInitials(name: string): string {
  if (!name) return 'P';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_COLORS = [
  { bg: 'rgba(16, 185, 129, 0.2)', text: '#10b981', border: 'rgba(16, 185, 129, 0.35)' },
  { bg: 'rgba(245, 158, 11, 0.2)', text: '#f59e0b', border: 'rgba(245, 158, 11, 0.35)' },
  { bg: 'rgba(20, 184, 166, 0.2)', text: '#14b8a6', border: 'rgba(20, 184, 166, 0.35)' },
  { bg: 'rgba(239, 68, 68, 0.2)', text: '#ef4444', border: 'rgba(239, 68, 68, 0.35)' },
  { bg: 'rgba(168, 85, 247, 0.2)', text: '#a855f7', border: 'rgba(168, 85, 247, 0.35)' },
  { bg: 'rgba(59, 130, 246, 0.2)', text: '#3b82f6', border: 'rgba(59, 130, 246, 0.35)' },
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

function getStatusBadgeStyles(status: string) {
  if (status === 'APPROVED') {
    return {
      backgroundColor: 'rgba(16, 185, 129, 0.15)',
      color: '#10b981',
      border: '1px solid rgba(16, 185, 129, 0.3)',
    };
  } else if (status === 'PENDING_REVIEW') {
    return {
      backgroundColor: 'rgba(245, 158, 11, 0.15)',
      color: '#f59e0b',
      border: '1px solid rgba(245, 158, 11, 0.3)',
    };
  } else if (status === 'SUSPENDED') {
    return {
      backgroundColor: 'rgba(239, 68, 68, 0.15)',
      color: '#ef4444',
      border: '1px solid rgba(239, 68, 68, 0.3)',
    };
  } else if (status === 'REJECTED') {
    return {
      backgroundColor: 'rgba(148, 163, 184, 0.12)',
      color: '#94a3b8',
      border: '1px solid rgba(148, 163, 184, 0.25)',
    };
  }
  return {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    color: '#94a3b8',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  };
}

// MEMOIZED KPI CARDS GRID - Isolated from search/filter/pagination re-renders
const KpiCardsGrid = React.memo(function KpiCardsGrid({ kpiCounts }: { kpiCounts: KpiCounts }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
        gap: '12px',
      }}
    >
      {/* Total Providers */}
      <div
        style={{
          backgroundColor: '#0b0e17',
          border: '1px solid rgba(255, 255, 255, 0.07)',
          borderRadius: '14px',
          padding: '14px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          minWidth: 0,
        }}
      >
        <div
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#10b981',
            flexShrink: 0,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', lineHeight: 1.1 }}>
            {kpiCounts.total}
          </div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#e2e8f0', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Total Providers
          </div>
          <div style={{ fontSize: '10px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            All registered providers
          </div>
        </div>
      </div>

      {/* Pending Review */}
      <div
        style={{
          backgroundColor: '#0b0e17',
          border: '1px solid rgba(255, 255, 255, 0.07)',
          borderRadius: '14px',
          padding: '14px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          minWidth: 0,
        }}
      >
        <div
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            backgroundColor: 'rgba(245, 158, 11, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#f59e0b',
            flexShrink: 0,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', lineHeight: 1.1 }}>
            {kpiCounts.pending}
          </div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#e2e8f0', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Pending Review
          </div>
          <div style={{ fontSize: '10px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Awaiting verification
          </div>
        </div>
      </div>

      {/* Approved */}
      <div
        style={{
          backgroundColor: '#0b0e17',
          border: '1px solid rgba(255, 255, 255, 0.07)',
          borderRadius: '14px',
          padding: '14px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          minWidth: 0,
        }}
      >
        <div
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#10b981',
            flexShrink: 0,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            <polyline points="9 12 11 14 15 10"></polyline>
          </svg>
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', lineHeight: 1.1 }}>
            {kpiCounts.approved}
          </div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#e2e8f0', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Approved
          </div>
          <div style={{ fontSize: '10px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Active providers
          </div>
        </div>
      </div>

      {/* Suspended */}
      <div
        style={{
          backgroundColor: '#0b0e17',
          border: '1px solid rgba(255, 255, 255, 0.07)',
          borderRadius: '14px',
          padding: '14px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          minWidth: 0,
        }}
      >
        <div
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ef4444',
            flexShrink: 0,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="10" y1="15" x2="10" y2="9"></line>
            <line x1="14" y1="15" x2="14" y2="9"></line>
          </svg>
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', lineHeight: 1.1 }}>
            {kpiCounts.suspended}
          </div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#e2e8f0', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Suspended
          </div>
          <div style={{ fontSize: '10px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Temporarily suspended
          </div>
        </div>
      </div>

      {/* Rejected */}
      <div
        style={{
          backgroundColor: '#0b0e17',
          border: '1px solid rgba(255, 255, 255, 0.07)',
          borderRadius: '14px',
          padding: '14px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          minWidth: 0,
        }}
      >
        <div
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            backgroundColor: 'rgba(168, 85, 247, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#a855f7',
            flexShrink: 0,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
          </svg>
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', lineHeight: 1.1 }}>
            {kpiCounts.rejected}
          </div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#e2e8f0', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Rejected
          </div>
          <div style={{ fontSize: '10px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Not approved
          </div>
        </div>
      </div>
    </div>
  );
});

// MEMOIZED PROVIDER TABLE ROW - Prevents row re-renders when other state changes
const ProviderTableRow = React.memo(function ProviderTableRow({
  provider,
  onSelect,
}: {
  provider: Provider;
  onSelect: (id: string) => void;
}) {
  const avatarInitials = useMemo(() => getAvatarInitials(provider.displayName), [provider.displayName]);
  const avatarTheme = useMemo(() => getAvatarColor(provider.displayName), [provider.displayName]);
  const badgeStyle = useMemo(() => getStatusBadgeStyles(provider.status), [provider.status]);

  return (
    <tr
      tabIndex={0}
      role="button"
      aria-label={`View details for ${provider.displayName}`}
      onClick={() => onSelect(provider.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(provider.id);
        }
      }}
      style={{
        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
        cursor: 'pointer',
        transition: 'background-color 0.15s ease',
        outline: 'none',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.025)')}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
    >
      {/* Provider Name + Avatar */}
      <td style={{ padding: '14px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: avatarTheme.bg,
              border: `1px solid ${avatarTheme.border}`,
              color: avatarTheme.text,
              fontWeight: 800,
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {avatarInitials}
          </div>
          <span style={{ fontWeight: 700, color: '#ffffff', fontSize: '13px' }}>
            {provider.displayName}
          </span>
        </div>
      </td>

      {/* Mobile Number */}
      <td style={{ padding: '14px 20px', color: '#cbd5e1', fontSize: '13px' }}>
        {provider.mobileNumber}
      </td>

      {/* Service Categories */}
      <td style={{ padding: '14px 20px', color: '#cbd5e1', fontSize: '13px' }}>
        {provider.categories && provider.categories.length > 0
          ? provider.categories.map((c) => c.name).join(', ')
          : 'None'}
      </td>

      {/* Status Badge */}
      <td style={{ padding: '14px 20px', whiteSpace: 'nowrap' }}>
        <span
          style={{
            padding: '4px 10px',
            borderRadius: '20px',
            fontSize: '10px',
            fontWeight: 800,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            display: 'inline-block',
            whiteSpace: 'nowrap',
            ...badgeStyle,
          }}
        >
          {provider.status.replace('_', ' ')}
        </span>
      </td>

      {/* Actions */}
      <td style={{ padding: '14px 20px', textAlign: 'right', whiteSpace: 'nowrap' }}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect(provider.id);
          }}
          style={{
            backgroundColor: 'transparent',
            color: '#10b981',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '8px',
            padding: '6px 14px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(16, 185, 129, 0.15)';
            e.currentTarget.style.borderColor = '#10b981';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.3)';
          }}
        >
          View Details
        </button>
      </td>
    </tr>
  );
});

function ProvidersPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { addToast } = useToast();

  const initialSearch = searchParams.get('search') || '';

  const [providers, setProviders] = useState<Provider[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const limit = 20;

  // AbortController ref & request sequence counter for race safety
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestSeqRef = useRef<number>(0);

  // KPI Summary Counts state - decoupled from search, status filter, and pagination
  const [kpiCounts, setKpiCounts] = useState<KpiCounts>({
    total: 0,
    pending: 0,
    approved: 0,
    suspended: 0,
    rejected: 0,
  });

  // Add Provider modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [serviceArea, setServiceArea] = useState('');
  const [availableCategories, setAvailableCategories] = useState<{ id: string; name: string }[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Fetch KPI summary using single aggregated summary endpoint
  const fetchKpis = useCallback(async () => {
    try {
      const summaryRes = await apiClient.get('/api/v1/admin/providers/summary');
      if (summaryRes && summaryRes.success && summaryRes.data) {
        setKpiCounts(summaryRes.data);
        return;
      }
    } catch (err) {
      try {
        const counts = { total: 0, pending: 0, approved: 0, suspended: 0, rejected: 0 };
        const [allRes, pendingRes, approvedRes, suspendedRes, rejectedRes] = await Promise.all([
          apiClient.get('/api/v1/admin/providers?limit=1').catch(() => null),
          apiClient.get('/api/v1/admin/providers?limit=1&status=PENDING_REVIEW').catch(() => null),
          apiClient.get('/api/v1/admin/providers?limit=1&status=APPROVED').catch(() => null),
          apiClient.get('/api/v1/admin/providers?limit=1&status=SUSPENDED').catch(() => null),
          apiClient.get('/api/v1/admin/providers?limit=1&status=REJECTED').catch(() => null),
        ]);

        if (allRes && typeof allRes.total === 'number') counts.total = allRes.total;
        if (pendingRes && typeof pendingRes.total === 'number') counts.pending = pendingRes.total;
        if (approvedRes && typeof approvedRes.total === 'number') counts.approved = approvedRes.total;
        if (suspendedRes && typeof suspendedRes.total === 'number') counts.suspended = suspendedRes.total;
        if (rejectedRes && typeof rejectedRes.total === 'number') counts.rejected = rejectedRes.total;

        setKpiCounts(counts);
      } catch (fallbackErr) {
        console.error('Failed to load provider KPI counts', fallbackErr);
      }
    }
  }, []);

  useEffect(() => {
    fetchKpis();
  }, [fetchKpis]);

  // Fetch service categories for onboard modal
  const fetchCategories = useCallback(async () => {
    try {
      const adminData = await apiClient.get('/api/v1/admin/catalog/categories');
      if (adminData && adminData.success && Array.isArray(adminData.data)) {
        setAvailableCategories(adminData.data);
        return;
      }
    } catch (err) {
      try {
        const pubData = await apiClient.get('/api/v1/catalog/categories');
        if (pubData && Array.isArray(pubData)) {
          setAvailableCategories(pubData);
        }
      } catch (fallbackErr) {
        console.error('Failed to load categories for provider onboarding', fallbackErr);
      }
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    if (modalOpen) {
      fetchCategories();
    }
  }, [modalOpen, fetchCategories]);

  // Sync state if URL query param changes externally
  useEffect(() => {
    const urlSearch = searchParams.get('search') || '';
    if (urlSearch !== search) {
      setSearch(urlSearch);
      setDebouncedSearch(urlSearch);
    }
  }, [searchParams]);

  // Handle search debouncing and URL parameter synchronization
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);

      const params = new URLSearchParams(window.location.search);
      if (search.trim()) {
        params.set('search', search.trim());
      } else {
        params.delete('search');
      }
      const queryString = params.toString();
      const targetUrl = queryString ? `${pathname}?${queryString}` : pathname;

      if (window.location.search !== (queryString ? `?${queryString}` : '')) {
        router.push(targetUrl);
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [search, pathname, router]);

  // Fetch providers with AbortController and sequence protection for race safety
  const fetchProviders = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const currentSeq = ++requestSeqRef.current;

    try {
      setLoading(true);
      setFetchError(null);

      let url = `/api/v1/admin/providers?page=${page}&limit=${limit}`;
      if (statusFilter !== 'ALL') {
        url += `&status=${statusFilter}`;
      }
      if (debouncedSearch) {
        url += `&search=${encodeURIComponent(debouncedSearch)}`;
      }

      const data = await apiClient.get(url, { signal: controller.signal });
      
      // Ensure only latest response updates state
      if (currentSeq === requestSeqRef.current && data && data.success) {
        setProviders(data.data);
        setTotal(data.total);
      }
    } catch (err: any) {
      if (err.name === 'AbortError' || err.code === 'ERR_CANCELED') {
        return; // Suppress aborted requests silently
      }
      if (currentSeq !== requestSeqRef.current) {
        return; // Ignore stale error responses
      }
      if (err.status === 401 || err.status === 403) {
        router.push('/admin/login');
        return;
      }
      const errMsg = err.message || 'Failed to fetch providers directory';
      setFetchError(errMsg);
      addToast(errMsg, 'error');
    } finally {
      if (currentSeq === requestSeqRef.current && abortControllerRef.current === controller) {
        setLoading(false);
      }
    }
  }, [page, limit, statusFilter, debouncedSearch, router, addToast]);

  useEffect(() => {
    fetchProviders();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchProviders]);

  const handleSelectProvider = useCallback(
    (id: string) => {
      router.push(`/admin/providers/${id}`);
    },
    [router]
  );

  const handleAddProviderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !mobileNumber.trim() || !serviceArea.trim()) {
      addToast('All fields are required.', 'warning');
      return;
    }
    if (selectedCategoryIds.length === 0) {
      addToast('Please select at least one service category.', 'warning');
      return;
    }
    if (!/^[6-9][0-9]{9}$/.test(mobileNumber)) {
      addToast('Please enter a valid 10-digit Indian mobile number.', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      await apiClient.post('/api/v1/admin/providers', {
        fullName,
        mobileNumber,
        serviceArea,
        categoryIds: selectedCategoryIds,
      });

      addToast('Provider onboarded successfully.', 'success');
      setModalOpen(false);
      setFullName('');
      setMobileNumber('');
      setServiceArea('');
      setSelectedCategoryIds([]);
      fetchProviders();
      fetchKpis();
    } catch (err: any) {
      addToast(err.message || 'Failed to add provider', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('...');
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (page < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', color: '#ffffff' }}>
      {/* PAGE HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#10b981',
              flexShrink: 0,
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          </div>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', margin: 0 }}>
              Service Providers Directory
            </h1>
            <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px', margin: 0, fontWeight: 400 }}>
              Onboard new service leads, manage approval/suspension status, and define skill capability mappings.
            </p>
          </div>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          style={{
            backgroundColor: '#10b981',
            color: '#ffffff',
            border: 'none',
            borderRadius: '10px',
            padding: '10px 20px',
            fontWeight: 700,
            fontSize: '13px',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#059669')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#10b981')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <line x1="19" y1="8" x2="19" y2="14"></line>
            <line x1="16" y1="11" x2="22" y2="11"></line>
          </svg>
          Onboard Provider
        </button>
      </div>

      {/* NAVIGATION TABS */}
      <div
        style={{
          display: 'flex',
          gap: '24px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          paddingBottom: '0',
          marginTop: '4px',
        }}
      >
        <Link
          href="/admin/providers"
          style={{
            paddingBottom: '12px',
            fontSize: '14px',
            fontWeight: 700,
            textDecoration: 'none',
            color: '#10b981',
            borderBottom: '2px solid #10b981',
            display: 'inline-block',
          }}
        >
          Registered Providers Directory
        </Link>
        <Link
          href="/admin/providers/leads"
          style={{
            paddingBottom: '12px',
            fontSize: '14px',
            fontWeight: 600,
            textDecoration: 'none',
            color: '#94a3b8',
            borderBottom: '2px solid transparent',
            display: 'inline-block',
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#cbd5e1')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
        >
          Provider Application Leads
        </Link>
      </div>

      {/* SEARCH & STATUS FILTER BAR */}
      <div
        style={{
          display: 'flex',
          gap: '16px',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ position: 'relative', flex: '1 1 300px', maxWidth: '440px' }}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#64748b"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
          >
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            placeholder="Search by name or mobile number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              backgroundColor: '#090c15',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '10px',
              padding: '10px 14px 10px 38px',
              color: '#ffffff',
              fontSize: '13px',
              outline: 'none',
              transition: 'border-color 0.2s',
              boxSizing: 'border-box',
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = '#10b981')}
            onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)')}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { key: 'ALL', label: 'All' },
            { key: 'PENDING_REVIEW', label: 'Pending Review' },
            { key: 'APPROVED', label: 'Approved' },
            { key: 'SUSPENDED', label: 'Suspended' },
            { key: 'REJECTED', label: 'Rejected' },
          ].map((item) => {
            const isActive = statusFilter === item.key;
            return (
              <button
                key={item.key}
                onClick={() => {
                  setStatusFilter(item.key);
                  setPage(1);
                }}
                style={{
                  backgroundColor: isActive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(15, 23, 42, 0.4)',
                  border: isActive ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.08)',
                  color: isActive ? '#10b981' : '#94a3b8',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontSize: '12px',
                  fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap',
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* MEMOIZED KPI CARDS GRID */}
      <KpiCardsGrid kpiCounts={kpiCounts} />

      {/* TABLE CONTAINER */}
      <div
        style={{
          backgroundColor: '#090c15',
          border: '1px solid rgba(255, 255, 255, 0.07)',
          borderRadius: '14px',
          padding: '4px',
          overflow: 'hidden',
        }}
      >
        {loading ? (
          <div style={{ padding: '16px' }}>
            <TableSkeleton rows={6} columns={5} />
          </div>
        ) : fetchError ? (
          <div style={{ textAlign: 'center', padding: '48px 24px', color: '#f87171' }}>
            <p style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px' }}>{fetchError}</p>
            <button
              onClick={fetchProviders}
              style={{
                backgroundColor: '#10b981',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 20px',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
              }}
            >
              Retry
            </button>
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table style={{ width: '100%', minWidth: '700px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
                      color: '#64748b',
                      textTransform: 'uppercase',
                      fontSize: '11px',
                      letterSpacing: '0.05em',
                      fontWeight: 700,
                    }}
                  >
                    <th style={{ padding: '14px 20px' }}>PROVIDER NAME</th>
                    <th style={{ padding: '14px 20px' }}>MOBILE</th>
                    <th style={{ padding: '14px 20px' }}>SERVICE CATEGORIES</th>
                    <th style={{ padding: '14px 20px' }}>STATUS BADGE</th>
                    <th style={{ padding: '14px 20px', textAlign: 'right' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {providers.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '48px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>
                        No service providers found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    providers.map((p) => (
                      <ProviderTableRow key={p.id} provider={p} onSelect={handleSelectProvider} />
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* PAGINATION BAR */}
            {total > 0 && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '16px 20px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.07)',
                  backgroundColor: '#070911',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} providers
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {/* Previous Page */}
                  <button
                    disabled={page === 1}
                    onClick={() => setPage((p) => Math.max(p - 1, 1))}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      color: page === 1 ? '#475569' : '#94a3b8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: page === 1 ? 'not-allowed' : 'pointer',
                      fontSize: '12px',
                    }}
                  >
                    ‹
                  </button>

                  {/* Numbered Page Buttons */}
                  {getPageNumbers().map((num, idx) => {
                    if (num === '...') {
                      return (
                        <span key={`dots-${idx}`} style={{ color: '#475569', padding: '0 4px', fontSize: '12px' }}>
                          ...
                        </span>
                      );
                    }
                    const isCurrent = num === page;
                    return (
                      <button
                        key={`page-${num}`}
                        onClick={() => setPage(num as number)}
                        style={{
                          minWidth: '32px',
                          height: '32px',
                          padding: '0 6px',
                          borderRadius: '6px',
                          backgroundColor: isCurrent ? '#10b981' : 'rgba(255, 255, 255, 0.04)',
                          border: isCurrent ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.08)',
                          color: isCurrent ? '#ffffff' : '#94a3b8',
                          fontWeight: isCurrent ? 700 : 500,
                          cursor: 'pointer',
                          fontSize: '12px',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {num}
                      </button>
                    );
                  })}

                  {/* Next Page */}
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      color: page >= totalPages ? '#475569' : '#94a3b8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                      fontSize: '12px',
                    }}
                  >
                    ›
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ONBOARD PROVIDER MODAL */}
      {modalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999,
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#0b0f19',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '16px',
              padding: '28px 24px',
              width: '100%',
              maxWidth: '480px',
              maxHeight: 'calc(100vh - 40px)',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                Onboard Service Provider
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '20px',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                ✕
              </button>
            </div>
            <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '24px', marginTop: 0 }}>
              Create a new provider profile. The initial status will be set to PENDING REVIEW.
            </p>

            <form onSubmit={handleAddProviderSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.04em' }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rajesh Kumar"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: '#020617',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    color: '#ffffff',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = '#10b981')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)')}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.04em' }}>
                  Mobile Number (Indian format) *
                </label>
                <input
                  type="text"
                  required
                  maxLength={10}
                  placeholder="e.g. 9876543210"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ''))}
                  style={{
                    width: '100%',
                    backgroundColor: '#020617',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    color: '#ffffff',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = '#10b981')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)')}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.04em' }}>
                  Primary Service Area *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Indiranagar, Bengaluru"
                  value={serviceArea}
                  onChange={(e) => setServiceArea(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: '#020617',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    color: '#ffffff',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = '#10b981')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)')}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.04em' }}>
                  Service Category Assignments *
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '140px', overflowY: 'auto', backgroundColor: '#020617', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  {availableCategories.length === 0 ? (
                    <span style={{ fontSize: '12px', color: '#64748b' }}>No categories available</span>
                  ) : (
                    availableCategories.map((cat) => (
                      <label key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#ffffff', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          value={cat.id}
                          checked={selectedCategoryIds.includes(cat.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCategoryIds((prev) => [...prev, cat.id]);
                            } else {
                              setSelectedCategoryIds((prev) => prev.filter((id) => id !== cat.id));
                            }
                          }}
                        />
                        {cat.name}
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{
                    flex: 1,
                    backgroundColor: 'transparent',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    padding: '10px',
                    color: '#94a3b8',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    flex: 1,
                    backgroundColor: '#10b981',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  {submitting ? 'Onboarding...' : 'Onboard'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProvidersPage() {
  return (
    <Suspense fallback={<TableSkeleton rows={6} columns={5} />}>
      <ProvidersPageContent />
    </Suspense>
  );
}
