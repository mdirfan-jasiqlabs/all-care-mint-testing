'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '../../../_components/Toast';

interface Provider {
  id: string;
  displayName: string;
  mobileNumber: string;
  serviceArea: string;
  status: string;
  categories: { id: string; name: string }[];
}

interface Category {
  id: string;
  name: string;
  description: string;
}

export default function ProviderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const { addToast } = useToast();

  const [provider, setProvider] = useState<Provider | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [pendingCategoryId, setPendingCategoryId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = sessionStorage.getItem('access_token');

      // 1. Fetch provider details
      const providerRes = await fetch(`http://localhost:3000/api/v1/admin/providers/${id}`, {
        headers: { Authorization: `Bearer ${token || ''}` },
      });
      if (!providerRes.ok) {
        if (providerRes.status === 401 || providerRes.status === 403) {
          router.push('/admin/login');
          return;
        }
        throw new Error('Failed to retrieve provider details');
      }
      const providerData = await providerRes.json();
      if (providerData.success) {
        setProvider(providerData.data);
      }

      // 2. Fetch all service categories
      try {
        const publicRes = await fetch('http://localhost:3000/api/v1/public/categories');
        const pubData = await publicRes.json();
        if (pubData.success && Array.isArray(pubData.data)) {
          setCategories(pubData.data);
        } else {
          const adminRes = await fetch('http://localhost:3000/api/v1/admin/catalog/categories', {
            headers: { Authorization: `Bearer ${token || ''}` },
          });
          const admData = await adminRes.json();
          if (admData.success && Array.isArray(admData.data)) {
            setCategories(admData.data);
          }
        }
      } catch {
        // Fallback fetch
      }
    } catch (err: any) {
      addToast(err.message || 'Error fetching data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  const handleStatusChange = async (newStatus: string) => {
    try {
      setSubmitting(true);
      const token = sessionStorage.getItem('access_token');
      const res = await fetch(`http://localhost:3000/api/v1/admin/providers/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || ''}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to update status');
      }

      addToast(`Provider status updated to ${newStatus}.`, 'success');
      await fetchData();
    } catch (err: any) {
      addToast(err.message || 'Status transition failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddCategory = async (categoryId: string) => {
    try {
      setSubmitting(true);
      setPendingCategoryId(categoryId);
      const token = sessionStorage.getItem('access_token');
      const res = await fetch(`http://localhost:3000/api/v1/admin/providers/${id}/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || ''}`,
        },
        body: JSON.stringify({ categoryId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to assign category');
      }

      addToast('Category mapped successfully.', 'success');
      await fetchData();
    } catch (err: any) {
      addToast(err.message || 'Mapping failed', 'error');
    } finally {
      setSubmitting(false);
      setPendingCategoryId(null);
    }
  };

  const handleRemoveCategory = async (categoryId: string) => {
    try {
      setSubmitting(true);
      setPendingCategoryId(categoryId);
      const token = sessionStorage.getItem('access_token');
      const res = await fetch(`http://localhost:3000/api/v1/admin/providers/${id}/categories/${categoryId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token || ''}`,
        },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to remove category');
      }

      addToast('Category mapping removed.', 'success');
      await fetchData();
    } catch (err: any) {
      addToast(err.message || 'Mapping removal failed', 'error');
    } finally {
      setSubmitting(false);
      setPendingCategoryId(null);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '48px', textAlign: 'center' }}>
        <div style={{ border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid #10b981', borderRadius: '50%', width: '32px', height: '32px', animation: 'spin 1s linear infinite', margin: '0 auto' }} />
      </div>
    );
  }

  if (!provider) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#f87171' }}>
        Provider profile not found.
      </div>
    );
  }

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
      padding: '6px 12px',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: 700,
      textTransform: 'uppercase' as const,
      backgroundColor,
      color,
      display: 'inline-block',
    };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* HEADER SECTION */}
      <div>
        <button
          onClick={() => router.push('/admin/providers')}
          style={{
            backgroundColor: 'transparent',
            border: 'none',
            color: '#94a3b8',
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginBottom: '16px',
            fontWeight: 500,
          }}
        >
          ← Back to Providers Directory
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#ffffff' }}>{provider.displayName}</h1>
            <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
              ID: {provider.id}
            </p>
          </div>
          <span style={getStatusBadgeStyles(provider.status)}>{provider.status.replace('_', ' ')}</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '32px' }}>
        {/* PROFILE CARD */}
        <div
          style={{
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff' }}>Profile Details</h2>

          <div>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>
              Mobile Number
            </div>
            <div style={{ fontSize: '15px', color: '#ffffff', fontWeight: 500 }}>{provider.mobileNumber}</div>
          </div>

          <div>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>
              Primary Service Area
            </div>
            <div style={{ fontSize: '15px', color: '#ffffff', fontWeight: 500 }}>{provider.serviceArea}</div>
          </div>

          <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '20px', marginTop: '10px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff', marginBottom: '16px' }}>Status Operations</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
              {provider.status === 'PENDING_REVIEW' && (
                <>
                  <button
                    disabled={submitting}
                    onClick={() => handleStatusChange('APPROVED')}
                    style={{
                      flex: 1,
                      backgroundColor: '#10b981',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '10px 16px',
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    Approve
                  </button>
                  <button
                    disabled={submitting}
                    onClick={() => handleStatusChange('REJECTED')}
                    style={{
                      flex: 1,
                      backgroundColor: 'rgba(239, 68, 68, 0.2)',
                      color: '#ef4444',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: '8px',
                      padding: '10px 16px',
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    Reject
                  </button>
                </>
              )}

              {provider.status === 'APPROVED' && (
                <button
                  disabled={submitting}
                  onClick={() => handleStatusChange('SUSPENDED')}
                  style={{
                    width: '100%',
                    backgroundColor: 'rgba(239, 68, 68, 0.2)',
                    color: '#ef4444',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '8px',
                    padding: '10px 16px',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Suspend Account
                </button>
              )}

              {provider.status === 'SUSPENDED' && (
                <button
                  disabled={submitting}
                  onClick={() => handleStatusChange('APPROVED')}
                  style={{
                    width: '100%',
                    backgroundColor: '#10b981',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px 16px',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Re-Approve Account
                </button>
              )}

              {provider.status === 'REJECTED' && (
                <button
                  disabled={submitting}
                  onClick={() => handleStatusChange('APPROVED')}
                  style={{
                    width: '100%',
                    backgroundColor: '#10b981',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px 16px',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Approve Account
                </button>
              )}
            </div>
          </div>
        </div>

        {/* SKILLS & CAPABILITIES */}
        <div
          style={{
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff' }}>Service Capabilities</h2>
          <p style={{ fontSize: '12px', color: '#94a3b8' }}>
            Map the service category catalog mappings for this provider to receive manual and auto job allocations.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {categories.map((cat) => {
              const isMapped = provider.categories.some((c) => c.id === cat.id);
              return (
                <div
                  key={cat.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '14px 16px',
                    backgroundColor: isMapped ? 'rgba(16, 185, 129, 0.04)' : 'rgba(255, 255, 255, 0.02)',
                    border: isMapped ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '12px',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff' }}>{cat.name}</div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{cat.description}</div>
                  </div>

                  {isMapped ? (
                    <button
                      disabled={submitting}
                      onClick={() => handleRemoveCategory(cat.id)}
                      style={{
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        color: '#f87171',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        borderRadius: '6px',
                        padding: '6px 14px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: submitting ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        opacity: submitting ? 0.7 : 1,
                      }}
                    >
                      {pendingCategoryId === cat.id ? (
                        <>
                          <span
                            style={{
                              width: '12px',
                              height: '12px',
                              border: '2px solid rgba(248, 113, 113, 0.3)',
                              borderTop: '2px solid #f87171',
                              borderRadius: '50%',
                              animation: 'spin 0.8s linear infinite',
                              display: 'inline-block',
                            }}
                          />
                          Removing...
                        </>
                      ) : (
                        'Remove'
                      )}
                    </button>
                  ) : (
                    <button
                      disabled={submitting}
                      onClick={() => handleAddCategory(cat.id)}
                      style={{
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        color: '#34d399',
                        border: '1px solid rgba(16, 185, 129, 0.2)',
                        borderRadius: '6px',
                        padding: '6px 14px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: submitting ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        opacity: submitting ? 0.7 : 1,
                      }}
                    >
                      {pendingCategoryId === cat.id ? (
                        <>
                          <span
                            style={{
                              width: '12px',
                              height: '12px',
                              border: '2px solid rgba(52, 211, 153, 0.3)',
                              borderTop: '2px solid #34d399',
                              borderRadius: '50%',
                              animation: 'spin 0.8s linear infinite',
                              display: 'inline-block',
                            }}
                          />
                          Adding...
                        </>
                      ) : (
                        'Add'
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
