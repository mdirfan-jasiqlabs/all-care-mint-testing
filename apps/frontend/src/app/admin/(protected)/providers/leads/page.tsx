'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import { useToast } from '../../../_components/Toast';
import TableSkeleton from '../../../_components/TableSkeleton';

interface ProviderLead {
  id: string;
  name: string;
  mobileNumber: string;
  serviceArea: string;
  isAcknowledged: boolean;
  createdAt: string;
}

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
              // Notify sidebar to refresh badge count immediately
              window.dispatchEvent(new Event('provider-leads-read'));
            }
          } catch (patchErr) {
            console.error('Failed to mark provider leads read:', patchErr);
            addToast('Could not reset unread badge status', 'warning');
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* HEADER & TOP TABS */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#ffffff', margin: 0 }}>
              Provider Application Leads
            </h1>
            <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px', margin: 0 }}>
              Review incoming registration leads submitted by prospective service providers.
            </p>
          </div>
          <Link
            href="/join-as-provider"
            target="_blank"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '8px',
              padding: '10px 16px',
              fontWeight: 600,
              fontSize: '13px',
              textDecoration: 'none',
            }}
          >
            ↗ Public Application Form
          </Link>
        </div>

        {/* NAVIGATION TABS */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            paddingBottom: '12px',
          }}
        >
          <Link
            href="/admin/providers"
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              textDecoration: 'none',
              color: '#94a3b8',
              backgroundColor: 'transparent',
            }}
          >
            Registered Providers Directory
          </Link>
          <Link
            href="/admin/providers/leads"
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 700,
              textDecoration: 'none',
              color: '#10b981',
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
            }}
          >
            Provider Application Leads
          </Link>
        </div>
      </div>

      {/* FILTER BAR */}
      <div
        style={{
          display: 'flex',
          gap: '16px',
          alignItems: 'center',
          flexWrap: 'wrap',
          backgroundColor: 'rgba(15, 23, 42, 0.25)',
          padding: '16px',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.05)',
        }}
      >
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <input
            type="text"
            placeholder="Search leads by applicant name, mobile, or area..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              backgroundColor: '#090b11',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '8px',
              padding: '10px 14px',
              color: '#ffffff',
              fontSize: '13px',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {['ALL', 'UNACKNOWLEDGED', 'ACKNOWLEDGED'].map((status) => (
            <button
              key={status}
              onClick={() => {
                setStatusFilter(status);
                setPage(1);
              }}
              style={{
                backgroundColor: statusFilter === status ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                border: statusFilter === status ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.08)',
                color: statusFilter === status ? '#10b981' : '#94a3b8',
                borderRadius: '8px',
                padding: '8px 14px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* TABLE CONTAINER */}
      <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.45)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', padding: '24px' }}>
        {loading ? (
          <TableSkeleton rows={5} columns={5} />
        ) : fetchError ? (
          <div style={{ textAlign: 'center', padding: '40px 24px', color: '#f87171' }}>
            <p style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px' }}>{fetchError}</p>
            <button
              onClick={fetchLeads}
              style={{
                backgroundColor: '#10b981',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 18px',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: '#64748b', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px' }}>
                  <th style={{ padding: '12px' }}>Applicant Name</th>
                  <th style={{ padding: '12px' }}>Mobile Number</th>
                  <th style={{ padding: '12px' }}>Service Area</th>
                  <th style={{ padding: '12px' }}>Status</th>
                  <th style={{ padding: '12px' }}>Submitted Date</th>
                </tr>
              </thead>
              <tbody>
                {leads.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                      No provider application leads found.
                    </td>
                  </tr>
                ) : (
                  leads.map((lead) => (
                    <tr
                      key={lead.id}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                        transition: 'background-color 0.2s',
                      }}
                    >
                      <td style={{ padding: '16px', fontWeight: 700, color: '#ffffff' }}>
                        {lead.name}
                      </td>
                      <td style={{ padding: '16px', color: '#cbd5e1' }}>
                        {lead.mobileNumber}
                      </td>
                      <td style={{ padding: '16px', color: '#cbd5e1' }}>
                        {lead.serviceArea}
                      </td>
                      <td style={{ padding: '16px' }}>
                        <span
                          style={{
                            padding: '4px 10px',
                            borderRadius: '20px',
                            fontSize: '11px',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            backgroundColor: lead.isAcknowledged ? 'rgba(100, 116, 139, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: lead.isAcknowledged ? '#94a3b8' : '#ef4444',
                            display: 'inline-block',
                          }}
                        >
                          {lead.isAcknowledged ? 'Acknowledged' : 'New Lead'}
                        </span>
                      </td>
                      <td style={{ padding: '16px', color: '#64748b', fontSize: '12px' }}>
                        {new Date(lead.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* PAGINATION */}
            {total > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '16px' }}>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  Page {page} of {totalPages} (Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} leads)
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    disabled={page === 1}
                    onClick={() => setPage((p) => Math.max(p - 1, 1))}
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      color: page === 1 ? '#64748b' : '#ffffff',
                      borderRadius: '6px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      cursor: page === 1 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Previous
                  </button>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      color: page >= totalPages ? '#64748b' : '#ffffff',
                      borderRadius: '6px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function ProviderLeadsPage() {
  return (
    <Suspense fallback={<TableSkeleton rows={5} columns={5} />}>
      <ProviderLeadsPageContent />
    </Suspense>
  );
}
