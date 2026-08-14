'use client';

import React, { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import { useToast } from '../../../_components/Toast';
import TableSkeleton from '../../../_components/TableSkeleton';
import {
  UserPlus,
  Users,
  CheckCircle2,
  Phone,
  MapPin,
  Clock,
  Search,
  X,
  Filter,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  UserCheck,
  Copy,
  Loader2,
} from 'lucide-react';

interface ProviderLead {
  id: string;
  name: string;
  mobileNumber: string;
  serviceArea: string;
  isAcknowledged: boolean;
  createdAt: string;
}

const getApplicantAvatarStyle = (name: string, index: number) => {
  const palette = [
    { bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.3)', color: '#34d399' },
    { bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.3)', color: '#60a5fa' },
    { bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.3)', color: '#fbbf24' },
    { bg: 'rgba(139, 92, 246, 0.15)', border: 'rgba(139, 92, 246, 0.3)', color: '#a78bfa' },
    { bg: 'rgba(236, 72, 153, 0.15)', border: 'rgba(236, 72, 153, 0.3)', color: '#f472b6' },
  ];
  return palette[index % palette.length];
};

const getInitials = (name: string) => {
  if (!name) return 'PL';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
};

function ProviderLeadsPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { addToast } = useToast();

  const initialSearch = searchParams.get('search') || '';

  const [leads, setLeads] = useState<ProviderLead[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [onboardingId, setOnboardingId] = useState<string | null>(null);
  const limit = 20;

  const hasMarkedReadRef = useRef(false);

  const handleOnboardLead = async (lead: ProviderLead) => {
    try {
      setOnboardingId(lead.id);
      const cleanMobile = lead.mobileNumber.replace(/\D/g, '').slice(-10);
      let targetProviderId: string | null = null;

      try {
        const res = await apiClient.post('/api/v1/admin/providers', {
          fullName: lead.name,
          mobileNumber: cleanMobile,
          serviceArea: lead.serviceArea || 'General',
        });
        if (res.success && res.data?.id) {
          targetProviderId = res.data.id;
          addToast('Lead onboarded successfully! Opening details page...', 'success');
        }
      } catch (createErr: any) {
        // If provider already exists, look up by mobile
        const listRes = await apiClient.get(`/api/v1/admin/providers?search=${encodeURIComponent(cleanMobile)}`);
        if (listRes.success && listRes.data && listRes.data.length > 0) {
          targetProviderId = listRes.data[0].id;
          addToast('Provider record found! Opening details page...', 'info');
        } else {
          addToast(createErr.message || 'Failed to onboard provider lead', 'error');
        }
      }

      if (targetProviderId) {
        router.push(`/admin/providers/${targetProviderId}`);
      }
    } catch (err: any) {
      addToast(err.message || 'An error occurred during onboarding', 'error');
    } finally {
      setOnboardingId(null);
    }
  };

  // Handle search debouncing
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

  const fetchLeads = async () => {
    try {
      setLoading(true);
      setFetchError(null);

      let url = `/api/v1/admin/notifications/provider-leads?page=${page}&limit=${limit}`;
      if (statusFilter !== 'ALL') {
        url += `&status=${statusFilter}`;
      }
      if (debouncedSearch) {
        url += `&search=${encodeURIComponent(debouncedSearch)}`;
      }

      const data = await apiClient.get(url);
      if (data.success) {
        setLeads(data.data || []);
        setTotal(data.total || 0);

        // Mark leads as read ONLY after successful data load, and exactly once per page mount session
        if (!hasMarkedReadRef.current) {
          hasMarkedReadRef.current = true;
          try {
            const markRes = await apiClient.patch('/api/v1/admin/notifications/provider-leads/read');
            if (markRes.success) {
              window.dispatchEvent(new Event('provider-leads-read'));
            }
          } catch (patchErr) {
            console.error('Failed to mark provider leads read:', patchErr);
          }
        }
      }
    } catch (err: any) {
      if (err.status === 401 || err.status === 403) {
        router.push('/admin/login');
        return;
      }
      const errMsg = err.message || 'Failed to fetch provider application leads';
      setFetchError(errMsg);
      addToast(errMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [page, statusFilter, debouncedSearch]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  // Compute stats metrics
  const stats = useMemo(() => {
    let unack = 0;
    let ack = 0;
    const areas = new Set<string>();

    leads.forEach((l) => {
      if (l.isAcknowledged) ack++;
      else unack++;
      if (l.serviceArea) areas.add(l.serviceArea.trim().toLowerCase());
    });

    return {
      total: total,
      newLeads: unack,
      acknowledged: ack,
      uniqueAreas: areas.size || (leads.length > 0 ? 1 : 0),
    };
  }, [leads, total]);

  const handleCopyPhone = (phone: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(phone);
    addToast(`Copied ${phone} to clipboard`, 'info');
  };

  return (
    <div style={{ maxWidth: '100%', width: '100%', display: 'flex', flexDirection: 'column', gap: '16px', color: 'var(--admin-text-primary)' }}>
      {/* 1. Header & Action Link */}
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
            <UserPlus size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--admin-text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
                Provider Application Leads
              </h1>
              <div style={{ color: '#10b981', display: 'flex', alignItems: 'center' }}>
                <CheckCircle2 size={16} />
              </div>
            </div>
            <p style={{ color: 'var(--admin-text-secondary)', fontSize: '13px', margin: 0, marginTop: '2px' }}>
              Review incoming registration applications submitted by prospective service providers.
            </p>
          </div>
        </div>

        <Link
          href="/join-as-provider"
          target="_blank"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '8px',
            backgroundColor: 'var(--admin-card-bg)',
            color: '#38bdf8',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            fontWeight: 700,
            fontSize: '12px',
            textDecoration: 'none',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.2s ease',
          }}
          className="hover:border-[#38bdf8] hover:bg-[rgba(56,189,248,0.08)]"
        >
          <ExternalLink size={14} />
          <span>Public Application Form</span>
        </Link>
      </div>

      {/* 2. Navigation Tab Bar */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--admin-border)',
          gap: '24px',
          paddingBottom: '2px',
          overflowX: 'auto',
        }}
      >
        <Link
          href="/admin/providers"
          style={{
            padding: '8px 4px 10px 4px',
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--admin-text-secondary)',
            borderBottom: '2px solid transparent',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s ease',
          }}
        >
          <Users size={15} />
          <span>Registered Providers Directory</span>
        </Link>
        <Link
          href="/admin/providers/leads"
          style={{
            padding: '8px 4px 10px 4px',
            fontSize: '13px',
            fontWeight: 700,
            color: '#10b981',
            borderBottom: '2px solid #10b981',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s ease',
          }}
        >
          <UserPlus size={15} />
          <span>Provider Application Leads</span>
          {stats.newLeads > 0 && (
            <span
              style={{
                backgroundColor: '#ef4444',
                color: '#ffffff',
                fontSize: '10px',
                fontWeight: 800,
                borderRadius: '8px',
                padding: '2px 6px',
                lineHeight: 1,
              }}
            >
              {stats.newLeads} NEW
            </span>
          )}
        </Link>
      </div>

      {/* 3. High-Density Summary KPI Cards */}
      {loading ? (
        <LeadsKpiSkeleton />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* KPI 1: Total Leads */}
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
              <span style={{ fontSize: '12px', color: 'var(--admin-text-secondary)', fontWeight: 600 }}>Total Applications</span>
              <div
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '7px',
                  backgroundColor: 'rgba(59, 130, 246, 0.12)',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#60a5fa',
                  flexShrink: 0,
                }}
              >
                <UserPlus size={15} />
              </div>
            </div>
            <div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--admin-text-primary)', letterSpacing: '-0.02em' }}>
                {stats.total.toLocaleString()}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)', marginTop: '2px', fontWeight: 500 }}>
                All prospective provider leads
              </div>
            </div>
          </div>

          {/* KPI 2: New Leads */}
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
              <span style={{ fontSize: '12px', color: 'var(--admin-text-secondary)', fontWeight: 600 }}>New / Pending</span>
              <div
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '7px',
                  backgroundColor: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#f87171',
                  flexShrink: 0,
                }}
              >
                <ShieldAlert size={15} />
              </div>
            </div>
            <div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#f87171', letterSpacing: '-0.02em' }}>
                {stats.newLeads.toLocaleString()}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)', marginTop: '2px', fontWeight: 500 }}>
                Require initial admin review
              </div>
            </div>
          </div>

          {/* KPI 3: Acknowledged Leads */}
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
              <span style={{ fontSize: '12px', color: 'var(--admin-text-secondary)', fontWeight: 600 }}>Acknowledged</span>
              <div
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '7px',
                  backgroundColor: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#10b981',
                  flexShrink: 0,
                }}
              >
                <UserCheck size={15} />
              </div>
            </div>
            <div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#10b981', letterSpacing: '-0.02em' }}>
                {stats.acknowledged.toLocaleString()}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)', marginTop: '2px', fontWeight: 500 }}>
                Reviewed by admin team
              </div>
            </div>
          </div>

          {/* KPI 4: Coverage Areas */}
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
              <span style={{ fontSize: '12px', color: 'var(--admin-text-secondary)', fontWeight: 600 }}>Service Areas</span>
              <div
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '7px',
                  backgroundColor: 'rgba(139, 92, 246, 0.12)',
                  border: '1px solid rgba(139, 92, 246, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#c084fc',
                  flexShrink: 0,
                }}
              >
                <MapPin size={15} />
              </div>
            </div>
            <div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--admin-text-primary)', letterSpacing: '-0.02em' }}>
                {stats.uniqueAreas.toLocaleString()}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)', marginTop: '2px', fontWeight: 500 }}>
                Distinct locations represented
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Main High-Density Data Card */}
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
        {/* Search & Filter Toolbar Header */}
        <div className="p-3.5 sm:p-4 border-b flex flex-col lg:flex-row lg:items-center justify-between gap-3 w-full" style={{ borderColor: 'var(--admin-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--admin-text-primary)', margin: 0, whiteSpace: 'nowrap' }}>
              Applicant Leads
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
                whiteSpace: 'nowrap',
              }}
            >
              {total} entries
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto lg:ml-auto">
            {/* Search Input */}
            <div className="w-full sm:w-[260px] lg:w-[280px] shrink-0" style={{ position: 'relative' }}>
              <Search
                size={14}
                style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--admin-text-muted)' }}
              />
              <input
                type="text"
                placeholder="Search by applicant name, mobile, or area..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: 'var(--admin-input-bg)',
                  border: '1px solid var(--admin-input-border)',
                  borderRadius: '8px',
                  padding: '7px 28px 7px 32px',
                  color: 'var(--admin-text-primary)',
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
                    color: 'var(--admin-text-muted)',
                    cursor: 'pointer',
                  }}
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Status Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto shrink-0 scrollbar-none pb-1 sm:pb-0">
              <Filter size={13} style={{ color: 'var(--admin-text-muted)', marginRight: '2px', flexShrink: 0 }} />
              {[
                { id: 'ALL', label: 'All Leads' },
                { id: 'UNACKNOWLEDGED', label: 'New Leads' },
                { id: 'ACKNOWLEDGED', label: 'Acknowledged' },
              ].map((filter) => {
                const isActive = statusFilter === filter.id;
                return (
                  <button
                    key={filter.id}
                    onClick={() => {
                      setStatusFilter(filter.id);
                      setPage(1);
                    }}
                    style={{
                      backgroundColor: isActive ? 'rgba(16, 185, 129, 0.15)' : 'var(--admin-card-bg)',
                      border: isActive ? '1px solid #10b981' : '1px solid var(--admin-border)',
                      color: isActive ? '#10b981' : 'var(--admin-text-secondary)',
                      borderRadius: '6px',
                      padding: '5px 10px',
                      fontSize: '11px',
                      fontWeight: isActive ? 700 : 500,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span>{filter.label}</span>
                    {filter.id === 'UNACKNOWLEDGED' && stats.newLeads > 0 && (
                      <span
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          backgroundColor: '#ef4444',
                        }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Data Table */}
        {loading ? (
          <div style={{ padding: '20px' }}>
            <TableSkeleton rows={5} columns={6} />
          </div>
        ) : fetchError ? (
          <div style={{ textAlign: 'center', padding: '36px 20px', color: '#f87171' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '10px' }}>{fetchError}</div>
            <button
              onClick={fetchLeads}
              style={{
                backgroundColor: '#10b981',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 16px',
                fontWeight: 700,
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Retry
            </button>
          </div>
        ) : (
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <table style={{ minWidth: '600px', width: '100%', tableLayout: 'auto', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
              <thead>
                <tr
                  style={{
                    backgroundColor: 'var(--admin-table-header-bg)',
                    borderBottom: '1px solid var(--admin-border)',
                    color: 'var(--admin-text-muted)',
                    fontSize: '10px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  <th style={{ padding: '10px 12px', width: '25%' }}>APPLICANT NAME</th>
                  <th style={{ padding: '10px 12px', width: '18%', whiteSpace: 'nowrap' }}>MOBILE NUMBER</th>
                  <th style={{ padding: '10px 12px', width: '18%', whiteSpace: 'nowrap' }}>SERVICE AREA</th>
                  <th style={{ padding: '10px 12px', width: '14%', whiteSpace: 'nowrap' }}>STATUS</th>
                  <th style={{ padding: '10px 12px', width: '14%', whiteSpace: 'nowrap' }}>SUBMITTED DATE</th>
                  <th style={{ padding: '10px 12px', width: '11%', textAlign: 'right', whiteSpace: 'nowrap' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {leads.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '36px 12px', textAlign: 'center', color: 'var(--admin-text-muted)' }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--admin-text-secondary)', marginBottom: '2px' }}>
                        No provider application leads found
                      </div>
                      <div style={{ fontSize: '12px' }}>
                        Try clearing your search terms or changing your status filter.
                      </div>
                    </td>
                  </tr>
                ) : (
                  leads.map((lead, idx) => {
                    const avatarStyle = getApplicantAvatarStyle(lead.name, idx);
                    const initials = getInitials(lead.name);

                    return (
                      <tr
                        key={lead.id}
                        style={{
                          borderBottom: '1px solid var(--admin-border-subtle)',
                          transition: 'background-color 0.12s ease',
                        }}
                        className="hover:bg-[var(--admin-surface-hover)]"
                      >
                        {/* Applicant Name with Compact Avatar */}
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                            <div
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '8px',
                                backgroundColor: avatarStyle.bg,
                                border: `1px solid ${avatarStyle.border}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: avatarStyle.color,
                                fontWeight: 800,
                                fontSize: '12px',
                                flexShrink: 0,
                              }}
                            >
                              {initials}
                            </div>
                            <div style={{ minWidth: 0, overflow: 'hidden' }}>
                              <div style={{ fontWeight: 700, color: 'var(--admin-text-primary)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '170px' }} title={lead.name}>
                                  {lead.name}
                                </span>
                                {!lead.isAcknowledged && (
                                  <span
                                    style={{
                                      backgroundColor: 'rgba(239, 68, 68, 0.2)',
                                      color: '#f87171',
                                      border: '1px solid rgba(239, 68, 68, 0.3)',
                                      fontSize: '9px',
                                      fontWeight: 800,
                                      borderRadius: '4px',
                                      padding: '1px 5px',
                                      lineHeight: 1,
                                      flexShrink: 0,
                                    }}
                                  >
                                    NEW
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: '10px', color: 'var(--admin-text-muted)', marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                ID: {lead.id.substring(0, 8)}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Mobile Number */}
                        <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Phone size={12} style={{ color: '#34d399', flexShrink: 0 }} />
                            <a
                              href={`tel:${lead.mobileNumber}`}
                              style={{ color: 'var(--admin-text-secondary)', textDecoration: 'none', fontWeight: 600, fontFamily: 'monospace', fontSize: '12px' }}
                            >
                              {lead.mobileNumber}
                            </a>
                            <button
                              onClick={(e) => handleCopyPhone(lead.mobileNumber, e)}
                              title="Copy mobile number"
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--admin-text-muted)',
                                cursor: 'pointer',
                                padding: '2px',
                                display: 'flex',
                                alignItems: 'center',
                                flexShrink: 0,
                              }}
                              className="hover:text-emerald-400"
                            >
                              <Copy size={11} />
                            </button>
                          </div>
                        </td>

                        {/* Service Area */}
                        <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                          <span
                            title={lead.serviceArea || 'Not specified'}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              backgroundColor: 'rgba(59, 130, 246, 0.1)',
                              border: '1px solid rgba(59, 130, 246, 0.2)',
                              color: '#60a5fa',
                              fontSize: '11px',
                              fontWeight: 600,
                              maxWidth: '160px',
                              overflow: 'hidden',
                              boxSizing: 'border-box',
                            }}
                          >
                            <MapPin size={11} style={{ flexShrink: 0 }} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {lead.serviceArea || 'Not specified'}
                            </span>
                          </span>
                        </td>

                        {/* Status Badge */}
                        <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '3px 8px',
                              borderRadius: '10px',
                              fontSize: '10px',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              backgroundColor: lead.isAcknowledged ? 'rgba(100, 116, 139, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                              border: lead.isAcknowledged ? '1px solid rgba(100, 116, 139, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                              color: lead.isAcknowledged ? 'var(--admin-text-secondary)' : '#f87171',
                            }}
                          >
                            <span
                              style={{
                                width: '5px',
                                height: '5px',
                                borderRadius: '50%',
                                backgroundColor: lead.isAcknowledged ? 'var(--admin-text-muted)' : '#ef4444',
                              }}
                            />
                            <span>{lead.isAcknowledged ? 'Acknowledged' : 'New Lead'}</span>
                          </span>
                        </td>

                        {/* Submitted Date */}
                        <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Clock size={12} style={{ color: 'var(--admin-text-muted)', flexShrink: 0 }} />
                            <div>
                              <div style={{ color: 'var(--admin-text-primary)', fontWeight: 600, fontSize: '11px' }}>
                                {new Date(lead.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                              </div>
                              <div style={{ color: 'var(--admin-text-muted)', fontSize: '10px', marginTop: '1px' }}>
                                {new Date(lead.createdAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Actions Column */}
                        <td style={{ padding: '10px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                            <button
                              onClick={() => handleOnboardLead(lead)}
                              disabled={onboardingId === lead.id}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '5px 12px',
                                borderRadius: '6px',
                                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                color: '#34d399',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: onboardingId === lead.id ? 'wait' : 'pointer',
                                whiteSpace: 'nowrap',
                                transition: 'all 0.12s ease',
                                opacity: onboardingId === lead.id ? 0.7 : 1,
                              }}
                              className="hover:bg-[rgba(16,185,129,0.25)] hover:border-[#10b981]"
                            >
                              {onboardingId === lead.id ? (
                                <>
                                  <Loader2 size={12} className="animate-spin" />
                                  <span>Opening...</span>
                                </>
                              ) : (
                                <>
                                  <UserCheck size={12} />
                                  <span>Onboard & Review</span>
                                </>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {!loading && !fetchError && total > 0 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 16px',
              borderTop: '1px solid var(--admin-border)',
              backgroundColor: 'var(--admin-card-bg)',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            <span style={{ fontSize: '12px', color: 'var(--admin-text-muted)' }}>
              Showing <strong style={{ color: 'var(--admin-text-primary)' }}>{(page - 1) * limit + 1}</strong> to{' '}
              <strong style={{ color: 'var(--admin-text-primary)' }}>{Math.min(page * limit, total)}</strong> of{' '}
              <strong style={{ color: 'var(--admin-text-primary)' }}>{total}</strong> applicant leads
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                  backgroundColor: 'var(--admin-surface-hover)',
                  border: '1px solid var(--admin-border)',
                  color: page === 1 ? 'var(--admin-text-muted)' : 'var(--admin-text-primary)',
                  borderRadius: '6px',
                  padding: '5px 10px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: page === 1 ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <ChevronLeft size={12} />
                <span>Previous</span>
              </button>

              <span style={{ fontSize: '11px', color: 'var(--admin-text-secondary)', padding: '0 6px' }}>
                {page} / {totalPages}
              </span>

              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
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
                  transition: 'all 0.15s ease',
                }}
              >
                <span>Next</span>
                <ChevronRight size={12} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProviderLeadsPage() {
  return (
    <Suspense fallback={<TableSkeleton rows={5} columns={6} />}>
      <ProviderLeadsPageContent />
    </Suspense>
  );
}

function LeadsKpiSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full" aria-busy="true" aria-label="Loading application lead statistics">
      {[1, 2, 3, 4].map((i) => (
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
            <div style={{ width: '90px', height: '12px', backgroundColor: 'var(--admin-skeleton-bg)', borderRadius: '4px' }} />
            <div style={{ width: '30px', height: '30px', borderRadius: '7px', backgroundColor: 'var(--admin-skeleton-bg)' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ width: '80px', height: '22px', backgroundColor: 'var(--admin-skeleton-bg)', borderRadius: '4px' }} />
            <div style={{ width: '110px', height: '10px', backgroundColor: 'var(--admin-skeleton-bg)', borderRadius: '4px' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

