'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
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

  // Add Provider modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [serviceArea, setServiceArea] = useState('');
  const [availableCategories, setAvailableCategories] = useState<{ id: string; name: string }[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Fetch service categories for onboard modal
  useEffect(() => {
    fetch('http://localhost:3000/api/v1/catalog/categories')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setAvailableCategories(data.data);
        }
      })
      .catch(() => {});
  }, []);

  // Sync state if URL query param changes externally (e.g. Browser Back/Forward)
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

  const fetchProviders = async () => {
    try {
      setLoading(true);
      setFetchError(null);
      const token = sessionStorage.getItem('access_token');
      
      let url = `http://localhost:3000/api/v1/admin/providers?page=${page}&limit=${limit}`;
      if (statusFilter !== 'ALL') {
        url += `&status=${statusFilter}`;
      }
      if (debouncedSearch) {
        url += `&search=${encodeURIComponent(debouncedSearch)}`;
      }

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token || ''}`,
        },
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          router.push('/admin/login');
          return;
        }
        throw new Error('Failed to fetch providers directory');
      }

      const data = await res.json();
      if (data.success) {
        setProviders(data.data);
        setTotal(data.total);
      }
    } catch (err: any) {
      const errMsg = err.message || 'Failed to fetch providers directory';
      setFetchError(errMsg);
      addToast(errMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, [page, statusFilter, debouncedSearch]);

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
    // Indian mobile number validation
    if (!/^[6-9][0-9]{9}$/.test(mobileNumber)) {
      addToast('Please enter a valid 10-digit Indian mobile number.', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      const token = sessionStorage.getItem('access_token');
      const res = await fetch('http://localhost:3000/api/v1/admin/providers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || ''}`,
        },
        body: JSON.stringify({
          fullName,
          mobileNumber,
          serviceArea,
          categoryIds: selectedCategoryIds,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to onboard provider');
      }

      addToast('Provider onboarded successfully.', 'success');
      setModalOpen(false);
      setFullName('');
      setMobileNumber('');
      setServiceArea('');
      setSelectedCategoryIds([]);
      fetchProviders();
    } catch (err: any) {
      addToast(err.message || 'Failed to add provider', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadgeStyles = (status: string) => {
    let backgroundColor = 'rgba(255, 255, 255, 0.08)';
    let color = '#94a3b8';

    if (status === 'APPROVED') {
      backgroundColor = 'rgba(16, 185, 129, 0.15)';
      color = '#10b981';
    } else if (status === 'PENDING_REVIEW') {
      backgroundColor = 'rgba(245, 158, 11, 0.15)';
      color = '#f59e0b';
    } else if (status === 'SUSPENDED') {
      backgroundColor = 'rgba(239, 68, 68, 0.15)';
      color = '#ef4444';
    } else if (status === 'REJECTED') {
      backgroundColor = 'rgba(100, 116, 139, 0.15)';
      color = '#64748b';
    }

    return {
      padding: '4px 10px',
      borderRadius: '20px',
      fontSize: '11px',
      fontWeight: 700,
      textTransform: 'uppercase' as const,
      backgroundColor,
      color,
      display: 'inline-block',
    };
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#ffffff' }}>Service Providers Directory</h1>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
            Onboard new service leads, manage approval/suspension status, and define skill capability mappings.
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          style={{
            backgroundColor: '#10b981',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 18px',
            fontWeight: 700,
            fontSize: '14px',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)',
            transition: 'all 0.2s',
          }}
        >
          + Onboard Provider
        </button>
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
            placeholder="Search by name or mobile number..."
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
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {['ALL', 'PENDING_REVIEW', 'APPROVED', 'SUSPENDED', 'REJECTED'].map((status) => (
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
              {status.replace('_', ' ')}
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
              onClick={fetchProviders}
              style={{
                backgroundColor: '#10b981',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 18px',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)',
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
                  <th style={{ padding: '12px' }}>Provider Name</th>
                  <th style={{ padding: '12px' }}>Mobile</th>
                  <th style={{ padding: '12px' }}>Service Categories</th>
                  <th style={{ padding: '12px' }}>Status Badge</th>
                  <th style={{ padding: '12px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {providers.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                      No service providers found.
                    </td>
                  </tr>
                ) : (
                  providers.map((p) => (
                    <tr
                      key={p.id}
                      tabIndex={0}
                      role="button"
                      aria-label={`View details for ${p.displayName}`}
                      onClick={() => router.push(`/admin/providers/${p.id}`)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          router.push(`/admin/providers/${p.id}`);
                        }
                      }}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s',
                        outline: 'none',
                      }}
                      onFocus={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)')}
                      onBlur={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <td style={{ padding: '16px', fontWeight: 700, color: '#ffffff' }}>
                        {p.displayName}
                      </td>
                      <td style={{ padding: '16px', color: '#cbd5e1' }}>
                        {p.mobileNumber}
                      </td>
                      <td style={{ padding: '16px', color: '#cbd5e1' }}>
                        {p.categories && p.categories.length > 0
                          ? p.categories.map((c) => c.name).join(', ')
                          : 'None'}
                      </td>
                      <td style={{ padding: '16px' }}>
                        <span style={getStatusBadgeStyles(p.status)}>{p.status.replace('_', ' ')}</span>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/admin/providers/${p.id}`);
                          }}
                          style={{
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            color: '#10b981',
                            border: '1px solid rgba(16, 185, 129, 0.2)',
                            borderRadius: '6px',
                            padding: '6px 12px',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          View Details
                        </button>
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
                  Page {page} of {totalPages} (Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} providers)
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

      {/* ONBOARD MODAL */}
      {modalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999,
          }}
        >
          <div
            style={{
              backgroundColor: '#0b0f19',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              padding: '32px',
              width: '100%',
              maxWidth: '480px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
            }}
          >
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', marginBottom: '8px' }}>
              Onboard Service Provider
            </h2>
            <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '24px' }}>
              Create a new provider profile. The initial status will be set to PENDING REVIEW.
            </p>

            <form onSubmit={handleAddProviderSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>
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
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    color: '#ffffff',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>
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
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    color: '#ffffff',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>
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
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    color: '#ffffff',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Service Category Assignments *
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '140px', overflowY: 'auto', backgroundColor: '#020617', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
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
                    border: '1px solid rgba(255, 255, 255, 0.08)',
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
    <Suspense fallback={<TableSkeleton rows={5} columns={5} />}>
      <ProvidersPageContent />
    </Suspense>
  );
}
