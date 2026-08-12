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
  Sparkles,
  UserCheck,
  Building2,
  Copy,
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
  const limit = 20;

  const hasMarkedReadRef = useRef(false);

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
    <div style={{ maxWidth: '1280px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* 1. Header & Quick Link CTA */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.5px', margin: 0 }}>
              Provider Application Leads
            </h1>
            <div style={{ color: '#10b981', display: 'flex', alignItems: 'center' }}>
              <CheckCircle2 size={18} className="text-[#10b981]" />
            </div>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '13px', maxWidth: '640px', lineHeight: '1.4', margin: 0 }}>
            Review incoming registration applications submitted by prospective service providers.
          </p>
        </div>

        <Link
          href="/join-as-provider"
          target="_blank"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            borderRadius: '8px',
            backgroundColor: 'rgba(255, 255, 255, 0.06)',
            color: '#ffffff',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            fontWeight: 600,
            fontSize: '12px',
            textDecoration: 'none',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.15)',
            transition: 'all 0.2s ease',
          }}
        >
          <ExternalLink size={14} style={{ color: '#38bdf8' }} />
          <span>Public Application Form</span>
        </Link>
      </div>

      {/* 2. Navigation Segment Bar */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          gap: '20px',
          paddingBottom: '2px',
        }}
      >
        <Link
          href="/admin/providers"
          style={{
            padding: '8px 4px 10px 4px',
            fontSize: '14px',
            fontWeight: 500,
            color: '#94a3b8',
            borderBottom: '2px solid transparent',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s ease',
          }}
        >
          <Users size={16} />
          <span>Registered Providers Directory</span>
        </Link>
        <Link
          href="/admin/providers/leads"
          style={{
            padding: '8px 4px 10px 4px',
            fontSize: '14px',
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
          <UserPlus size={16} />
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
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: '12px',
        }}
      >
        {/* KPI 1: Total Leads */}
        <div
          style={{
            backgroundColor: '#0d1424',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '12px 16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.15)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8' }}>Total Applications</span>
            <div
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '8px',
                backgroundColor: 'rgba(59, 130, 246, 0.12)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#3b82f6',
                flexShrink: 0,
              }}
            >
              <UserPlus size={15} />
            </div>
          </div>
          <div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff', lineHeight: 1.1, letterSpacing: '-0.5px' }}>
              {stats.total}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
              All prospective provider leads
            </div>
          </div>
        </div>

        {/* KPI 2: New Leads */}
        <div
          style={{
            backgroundColor: '#0d1424',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '12px 16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.15)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8' }}>New / Pending</span>
            <div
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '8px',
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ef4444',
                flexShrink: 0,
              }}
            >
              <ShieldAlert size={15} />
            </div>
          </div>
          <div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff', lineHeight: 1.1, letterSpacing: '-0.5px' }}>
              {stats.newLeads}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
              Require initial admin review
            </div>
          </div>
        </div>

        {/* KPI 3: Acknowledged Leads */}
        <div
          style={{
            backgroundColor: '#0d1424',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '12px 16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.15)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8' }}>Acknowledged</span>
            <div
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '8px',
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
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff', lineHeight: 1.1, letterSpacing: '-0.5px' }}>
              {stats.acknowledged}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
              Reviewed by admin team
            </div>
          </div>
        </div>

        {/* KPI 4: Coverage Areas */}
        <div
          style={{
            backgroundColor: '#0d1424',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '12px 16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.15)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8' }}>Service Areas</span>
            <div
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '8px',
                backgroundColor: 'rgba(139, 92, 246, 0.12)',
                border: '1px solid rgba(139, 92, 246, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#a78bfa',
                flexShrink: 0,
              }}
            >
              <MapPin size={15} />
            </div>
          </div>
          <div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff', lineHeight: 1.1, letterSpacing: '-0.5px' }}>
              {stats.uniqueAreas}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
              Distinct locations represented
            </div>
          </div>
        </div>
      </div>

      {/* 4. Search & Filter Toolbar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
          backgroundColor: '#0d1424',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          padding: '10px 14px',
        }}
      >
        {/* Search Input */}
        <div style={{ position: 'relative', flex: '1', minWidth: '220px', maxWidth: '380px' }}>
          <Search
            size={14}
            style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}
          />
          <input
            type="text"
            placeholder="Search leads by applicant name, mobile, or area..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '6px 30px 6px 32px',
              color: '#ffffff',
              fontSize: '12px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
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
              <X size={12} />
            </button>
          )}
        </div>

        {/* Status Filter Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <Filter size={13} style={{ color: '#64748b', marginRight: '2px' }} />
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
                  backgroundColor: isActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                  border: isActive ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.08)',
                  color: isActive ? '#10b981' : '#94a3b8',
                  borderRadius: '6px',
                  padding: '5px 10px',
                  fontSize: '11px',
                  fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
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

      {/* 5. Main High-Density Data Table Card */}
      <div
        style={{
          backgroundColor: '#0d1424',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '14px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
        }}
      >
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
          <div className="overflow-x-auto">
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
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
                  <th style={{ padding: '10px 14px', width: '25%' }}>APPLICANT NAME</th>
                  <th style={{ padding: '10px 14px', width: '16%', whiteSpace: 'nowrap' }}>MOBILE NUMBER</th>
                  <th style={{ padding: '10px 14px', width: '15%', whiteSpace: 'nowrap' }}>SERVICE AREA</th>
                  <th style={{ padding: '10px 14px', width: '14%', whiteSpace: 'nowrap' }}>STATUS BADGE</th>
                  <th style={{ padding: '10px 14px', width: '18%', whiteSpace: 'nowrap' }}>SUBMITTED DATE</th>
                  <th style={{ padding: '10px 14px', width: '12%', textAlign: 'right', whiteSpace: 'nowrap' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {leads.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '36px 14px', textAlign: 'center', color: '#64748b' }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#94a3b8', marginBottom: '2px' }}>
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
                    const formattedDate = `${new Date(lead.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} • ${new Date(lead.createdAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;

                    return (
                      <tr
                        key={lead.id}
                        style={{
                          borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                          transition: 'background-color 0.12s ease',
                        }}
                      >
                        {/* Applicant Name with Compact Avatar */}
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{lead.name}</span>
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
                                    }}
                                  >
                                    NEW
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: '10px', color: '#64748b', marginTop: '1px' }}>
                                ID: {lead.id.substring(0, 8)}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Mobile Number */}
                        <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Phone size={12} style={{ color: '#34d399' }} />
                            <a
                              href={`tel:${lead.mobileNumber}`}
                              style={{ color: '#cbd5e1', textDecoration: 'none', fontWeight: 600, fontFamily: 'monospace', fontSize: '12px' }}
                            >
                              {lead.mobileNumber}
                            </a>
                            <button
                              onClick={(e) => handleCopyPhone(lead.mobileNumber, e)}
                              title="Copy mobile number"
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#64748b',
                                cursor: 'pointer',
                                padding: '2px',
                                display: 'flex',
                                alignItems: 'center',
                              }}
                            >
                              <Copy size={11} />
                            </button>
                          </div>
                        </td>

                        {/* Service Area */}
                        <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                          <span
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
                            }}
                          >
                            <MapPin size={11} />
                            <span>{lead.serviceArea || 'Not specified'}</span>
                          </span>
                        </td>

                        {/* Status Badge */}
                        <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
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
                              color: lead.isAcknowledged ? '#94a3b8' : '#f87171',
                            }}
                          >
                            <span
                              style={{
                                width: '5px',
                                height: '5px',
                                borderRadius: '50%',
                                backgroundColor: lead.isAcknowledged ? '#94a3b8' : '#ef4444',
                              }}
                            />
                            <span>{lead.isAcknowledged ? 'Acknowledged' : 'New Lead'}</span>
                          </span>
                        </td>

                        {/* Submitted Date */}
                        <td style={{ padding: '10px 14px', color: '#94a3b8', fontSize: '11px', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <Clock size={11} style={{ color: '#64748b' }} />
                            <span>{formattedDate}</span>
                          </div>
                        </td>

                        {/* Actions Column */}
                        <td style={{ padding: '10px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                            <Link
                              href={`/admin/providers?onboard=true&name=${encodeURIComponent(lead.name)}&phone=${encodeURIComponent(lead.mobileNumber)}`}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '5px 10px',
                                borderRadius: '6px',
                                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                color: '#34d399',
                                fontSize: '11px',
                                fontWeight: 600,
                                textDecoration: 'none',
                                whiteSpace: 'nowrap',
                                transition: 'all 0.12s ease',
                              }}
                            >
                              <UserCheck size={12} />
                              <span>Onboard Provider</span>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* 6. Pagination Footer */}
            {total > 0 && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 14px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  backgroundColor: 'rgba(255, 255, 255, 0.01)',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}
              >
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  Showing <strong style={{ color: '#ffffff' }}>{(page - 1) * limit + 1}</strong> to{' '}
                  <strong style={{ color: '#ffffff' }}>{Math.min(page * limit, total)}</strong> of{' '}
                  <strong style={{ color: '#ffffff' }}>{total}</strong> applicant leads
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    disabled={page === 1}
                    onClick={() => setPage((p) => Math.max(p - 1, 1))}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                      backgroundColor: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      color: page === 1 ? '#475569' : '#ffffff',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: page === 1 ? 'not-allowed' : 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <ChevronLeft size={12} />
                    <span>Previous</span>
                  </button>

                  <span style={{ fontSize: '11px', color: '#94a3b8', padding: '0 6px' }}>
                    {page} / {totalPages}
                  </span>

                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                      backgroundColor: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      color: page >= totalPages ? '#475569' : '#ffffff',
                      borderRadius: '6px',
                      padding: '4px 10px',
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
