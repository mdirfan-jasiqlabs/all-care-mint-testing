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
  { bg: 'rgba(16, 185, 129, 0.15)', text: '#34d399', border: 'rgba(16, 185, 129, 0.3)' },
  { bg: 'rgba(59, 130, 246, 0.15)', text: '#60a5fa', border: 'rgba(59, 130, 246, 0.3)' },
  { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)' },
  { bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171', border: 'rgba(239, 68, 68, 0.3)' },
  { bg: 'rgba(168, 85, 247, 0.15)', text: '#c084fc', border: 'rgba(168, 85, 247, 0.3)' },
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

function getStatusBadgeStyles(status: string) {
  if (status === 'APPROVED') {
    return {
      backgroundColor: 'rgba(16, 185, 129, 0.14)',
      color: '#34d399',
      border: '1px solid rgba(52, 211, 153, 0.28)',
    };
  } else if (status === 'PENDING_REVIEW') {
    return {
      backgroundColor: 'rgba(245, 158, 11, 0.14)',
      color: '#fbbf24',
      border: '1px solid rgba(251, 191, 36, 0.28)',
    };
  } else if (status === 'SUSPENDED') {
    return {
      backgroundColor: 'rgba(239, 68, 68, 0.14)',
      color: '#f87171',
      border: '1px solid rgba(248, 113, 113, 0.28)',
    };
  } else if (status === 'REJECTED') {
    return {
      backgroundColor: 'rgba(148, 163, 184, 0.14)',
      color: '#94a3b8',
      border: '1px solid rgba(148, 163, 184, 0.28)',
    };
  }
  return {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    color: '#94a3b8',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  };
}

// MEMOIZED KPI CARDS GRID - 5 Equal Height Cards (120px height)
const KpiCardsGrid = React.memo(function KpiCardsGrid({ kpiCounts, loading }: { kpiCounts: KpiCounts; loading: boolean }) {
  if (loading) {
    return <ProvidersKpiSkeleton />;
  }

  const cards = [
    {
      title: 'Total Providers',
      value: kpiCounts.total,
      subtext: 'All registered providers',
      iconColor: '#10b981',
      iconBg: 'rgba(16, 185, 129, 0.12)',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
      ),
    },
    {
      title: 'Pending Review',
      value: kpiCounts.pending,
      subtext: 'Awaiting verification',
      iconColor: '#f59e0b',
      iconBg: 'rgba(245, 158, 11, 0.12)',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
      ),
    },
    {
      title: 'Approved',
      value: kpiCounts.approved,
      subtext: 'Active providers',
      iconColor: '#10b981',
      iconBg: 'rgba(16, 185, 129, 0.12)',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
          <polyline points="9 12 11 14 15 10"></polyline>
        </svg>
      ),
    },
    {
      title: 'Suspended',
      value: kpiCounts.suspended,
      subtext: 'Temporarily suspended',
      iconColor: '#ef4444',
      iconBg: 'rgba(239, 68, 68, 0.12)',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="10" y1="15" x2="10" y2="9"></line>
          <line x1="14" y1="15" x2="14" y2="9"></line>
        </svg>
      ),
    },
    {
      title: 'Rejected',
      value: kpiCounts.rejected,
      subtext: 'Not approved',
      iconColor: '#a855f7',
      iconBg: 'rgba(168, 85, 247, 0.12)',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
        </svg>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 w-full">
      {cards.map((card, idx) => (
        <div
          key={idx}
          style={{
            backgroundColor: '#090d16',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxSizing: 'border-box',
            minWidth: 0,
            minHeight: '104px',
          }}
          className={idx === 4 ? 'col-span-2 sm:col-span-1 lg:col-span-1' : ''}
        >
          {/* Top Row: Icon + Large Count Value */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '8px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: card.iconBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: card.iconColor,
                flexShrink: 0,
              }}
            >
              {card.icon}
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#f8fafc', lineHeight: 1 }}>
              {card.value}
            </div>
          </div>

          {/* Bottom Labels: Title + Subtext */}
          <div style={{ minWidth: 0, width: '100%' }}>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#e2e8f0',
                lineHeight: 1.25,
                wordBreak: 'break-word',
              }}
            >
              {card.title}
            </div>
            <div
              style={{
                fontSize: '10px',
                color: '#64748b',
                marginTop: '3px',
                lineHeight: 1.2,
                wordBreak: 'break-word',
              }}
            >
              {card.subtext}
            </div>
          </div>
        </div>
      ))}
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

  const categoryNames = useMemo(() => {
    if (!provider.categories || provider.categories.length === 0) return 'None';
    return provider.categories.map((c) => c.name).join(', ');
  }, [provider.categories]);

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
        transition: 'background-color 0.12s ease',
        outline: 'none',
      }}
      className="hover:bg-[rgba(255,255,255,0.02)]"
    >
      {/* Provider Name + Avatar */}
      <td style={{ padding: '10px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: avatarTheme.bg,
              border: `1px solid ${avatarTheme.border}`,
              color: avatarTheme.text,
              fontWeight: 800,
              fontSize: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {avatarInitials}
          </div>
          <span
            style={{
              fontWeight: 700,
              color: '#f8fafc',
              fontSize: '12px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '180px',
            }}
            title={provider.displayName}
          >
            {provider.displayName}
          </span>
        </div>
      </td>

      {/* Mobile Number */}
      <td style={{ padding: '10px 12px', color: '#cbd5e1', fontSize: '12px', whiteSpace: 'nowrap' }}>
        {provider.mobileNumber}
      </td>

      {/* Service Categories */}
      <td style={{ padding: '10px 12px', color: '#94a3b8', fontSize: '12px' }}>
        <span
          style={{
            display: 'block',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: '220px',
          }}
          title={categoryNames}
        >
          {categoryNames}
        </span>
      </td>

      {/* Status Badge */}
      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
        <span
          style={{
            padding: '3px 8px',
            borderRadius: '9999px',
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
      <td style={{ padding: '10px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect(provider.id);
          }}
          style={{
            backgroundColor: 'transparent',
            color: '#10b981',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '6px',
            padding: '4px 10px',
            fontSize: '11px',
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
    <div style={{ maxWidth: '100%', width: '100%', display: 'flex', flexDirection: 'column', gap: '16px', color: '#ffffff' }}>
      {/* 1. PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
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
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          </div>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em', margin: 0 }}>
              Service Providers Directory
            </h1>
            <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '2px', margin: 0, fontWeight: 400, lineHeight: 1.4 }}>
              Onboard new service leads, manage approval/suspension status, and define skill capability mappings.
            </p>
          </div>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          style={{
            backgroundColor: '#10b981',
            color: '#020617',
            border: 'none',
            borderRadius: '8px',
            padding: '9px 16px',
            fontWeight: 700,
            fontSize: '12px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            transition: 'all 0.15s ease',
          }}
          className="hover:bg-[#34d399] w-full sm:w-auto active:scale-[0.98]"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <line x1="19" y1="8" x2="19" y2="14"></line>
            <line x1="16" y1="11" x2="22" y2="11"></line>
          </svg>
          <span>Onboard Provider</span>
        </button>
      </div>

      {/* 2. NAVIGATION TABS */}
      <div
        style={{
          display: 'flex',
          gap: '24px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          paddingBottom: '2px',
          overflowX: 'auto',
        }}
        className="w-full scrollbar-none"
      >
        <Link
          href="/admin/providers"
          style={{
            paddingBottom: '10px',
            fontSize: '13px',
            fontWeight: 700,
            textDecoration: 'none',
            color: '#f8fafc',
            borderBottom: '2px solid #10b981',
            display: 'inline-block',
            whiteSpace: 'nowrap',
          }}
        >
          Registered Providers Directory
        </Link>
        <Link
          href="/admin/providers/leads"
          style={{
            paddingBottom: '10px',
            fontSize: '13px',
            fontWeight: 500,
            textDecoration: 'none',
            color: '#94a3b8',
            borderBottom: '2px solid transparent',
            display: 'inline-block',
            transition: 'color 0.15s',
            whiteSpace: 'nowrap',
          }}
          className="hover:text-slate-200"
        >
          Provider Application Leads
        </Link>
      </div>

      {/* 3. MEMOIZED KPI CARDS GRID */}
      <KpiCardsGrid kpiCounts={kpiCounts} loading={loading} />

      {/* 4. MAIN DIRECTORY TABLE CARD */}
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
        {/* Search & Filter Toolbar Header */}
        <div
          style={{
            padding: '14px 16px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
              Registered Directory
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
              {total} total
            </span>
          </div>

          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5 w-full sm:w-auto sm:ml-auto">
            {/* Search Input */}
            <div className="w-full sm:max-w-[300px]" style={{ position: 'relative' }}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#64748b"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
              >
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input
                type="text"
                placeholder="Search by name or mobile..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: '#090d16',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '8px',
                  padding: '8px 28px 8px 32px',
                  color: '#f8fafc',
                  fontSize: '12px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                className="focus:border-[#10b981]"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Status Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
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
                      backgroundColor: isActive ? 'rgba(16, 185, 129, 0.14)' : 'transparent',
                      border: isActive ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.08)',
                      color: isActive ? '#10b981' : '#94a3b8',
                      borderRadius: '6px',
                      padding: '5px 10px',
                      fontSize: '11px',
                      fontWeight: isActive ? 700 : 500,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Data Table Container */}
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
                color: '#020617',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 20px',
                fontWeight: 700,
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Retry
            </button>
          </div>
        ) : (
          <div>
            <div style={{ overflowX: 'auto', width: '100%' }}>
              <table style={{ minWidth: '650px', width: '100%', tableLayout: 'auto', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
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
                    <th style={{ padding: '10px 12px', width: '28%' }}>PROVIDER NAME</th>
                    <th style={{ padding: '10px 12px', width: '18%', whiteSpace: 'nowrap' }}>MOBILE</th>
                    <th style={{ padding: '10px 12px', width: '28%' }}>SERVICE CATEGORIES</th>
                    <th style={{ padding: '10px 12px', width: '14%', whiteSpace: 'nowrap' }}>STATUS BADGE</th>
                    <th style={{ padding: '10px 12px', width: '12%', textAlign: 'right', whiteSpace: 'nowrap' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {providers.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '36px 12px', textAlign: 'center', color: '#64748b' }}>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#94a3b8', marginBottom: '2px' }}>
                          No providers found
                        </div>
                        <div style={{ fontSize: '12px' }}>
                          No service providers found matching criteria.
                        </div>
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

            {/* Pagination Bar */}
            {total > 0 && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  backgroundColor: 'rgba(255, 255, 255, 0.01)',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}
              >
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  Showing <strong style={{ color: '#f8fafc' }}>{(page - 1) * limit + 1}</strong> to{' '}
                  <strong style={{ color: '#f8fafc' }}>{Math.min(page * limit, total)}</strong> of{' '}
                  <strong style={{ color: '#f8fafc' }}>{total}</strong> providers
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {/* Previous Page */}
                  <button
                    disabled={page === 1}
                    onClick={() => setPage((p) => Math.max(p - 1, 1))}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '6px',
                      backgroundColor: '#090d16',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: page === 1 ? '#475569' : '#f8fafc',
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
                          minWidth: '28px',
                          height: '28px',
                          padding: '0 6px',
                          borderRadius: '6px',
                          backgroundColor: isCurrent ? 'rgba(16, 185, 129, 0.14)' : '#090d16',
                          border: isCurrent ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.08)',
                          color: isCurrent ? '#10b981' : '#94a3b8',
                          fontWeight: isCurrent ? 700 : 500,
                          cursor: 'pointer',
                          fontSize: '11px',
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
                      padding: '4px 8px',
                      borderRadius: '6px',
                      backgroundColor: '#090d16',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: page >= totalPages ? '#475569' : '#f8fafc',
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
              backgroundColor: '#090d16',
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
                    backgroundColor: '#090d16',
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
                    backgroundColor: '#090d16',
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
                    backgroundColor: '#090d16',
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '140px', overflowY: 'auto', backgroundColor: '#090d16', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
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
                    color: '#020617',
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

function ProvidersKpiSkeleton() {
  return (
    <div
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 w-full"
      aria-busy="true"
      aria-label="Loading provider statistics"
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          style={{
            backgroundColor: '#090d16',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '12px 14px',
            minHeight: '104px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxSizing: 'border-box',
            minWidth: 0,
          }}
          className={`animate-pulse ${i === 5 ? 'col-span-2 sm:col-span-1 lg:col-span-1' : ''}`}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: 'rgba(255, 255, 255, 0.08)', flexShrink: 0 }} />
            <div style={{ width: '40px', height: '24px', backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: '4px' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
            <div style={{ width: '90px', height: '12px', backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: '4px' }} />
            <div style={{ width: '70px', height: '10px', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

