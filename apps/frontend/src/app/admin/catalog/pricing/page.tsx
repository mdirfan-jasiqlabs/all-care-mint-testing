'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '../../_components/Toast';
import ConfirmModal from '../../_components/ConfirmModal';
import TableSkeleton from '../../_components/TableSkeleton';


interface ServiceCategory {
  id: string;
  name: string;
}

interface ServiceItem {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  fixedPrice: string;
  estimatedDuration: string | null;
  isActive: boolean;
}

type SortOrder = 'asc' | 'desc' | null;

export default function PricingManagerPage() {
  const router = useRouter();
  const { addToast } = useToast();

  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sorting state
  const [sortOrder, setSortOrder] = useState<SortOrder>(null);

  // Drawer Form state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [drawerError, setDrawerError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    categoryId: '',
    name: '',
    description: '',
    fixedPrice: '',
    estimatedDuration: '',
  });

  // Modal State for Deactivation
  const [deactivatingService, setDeactivatingService] = useState<ServiceItem | null>(null);

  // Initial categories fetch
  const fetchCategories = async () => {
    try {
      setError(null);
      const token = sessionStorage.getItem('access_token');
      const res = await fetch('http://localhost:3000/api/v1/admin/catalog/categories', {
        headers: { 'Authorization': `Bearer ${token || ''}` },
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          addToast('Session expired or access denied', 'error');
          router.push('/login/admin');
          return;
        }
        throw new Error(`Failed to load categories (${res.status})`);
      }

      const data = await res.json();
      if (data.success && data.data.length > 0) {
        setCategories(data.data);
        setSelectedCategoryId(data.data[0].id);
        setFormData((prev) => ({ ...prev, categoryId: data.data[0].id }));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch categories');
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchServices = async (catId: string) => {
    if (!catId) return;
    try {
      setLoading(true);
      setError(null);
      const token = sessionStorage.getItem('access_token');
      const res = await fetch(`http://localhost:3000/api/v1/admin/catalog/categories/${catId}/services`, {
        headers: { 'Authorization': `Bearer ${token || ''}` },
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          addToast('Session expired or access denied', 'error');
          router.push('/login/admin');
          return;
        }
        throw new Error(`Failed to load services (${res.status})`);
      }

      const data = await res.json();
      if (data.success) {
        setServices(data.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch services');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCategoryId) {
      fetchServices(selectedCategoryId);
    }
  }, [selectedCategoryId]);

  // Sorting Handler
  const handleSort = () => {
    let nextOrder: SortOrder = 'asc';
    if (sortOrder === 'asc') nextOrder = 'desc';
    else if (sortOrder === 'desc') nextOrder = null;

    setSortOrder(nextOrder);
  };

  const getSortedServices = () => {
    if (!sortOrder) return services;
    return [...services].sort((a, b) => {
      const nameA = a.name.toLowerCase();
      const nameB = b.name.toLowerCase();
      if (nameA < nameB) return sortOrder === 'asc' ? -1 : 1;
      if (nameA > nameB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  };

  // Open Drawer in Create/Edit mode
  const openDrawer = (service: ServiceItem | null = null) => {
    setDrawerError(null);
    if (service) {
      setEditingService(service);
      setFormData({
        categoryId: service.categoryId,
        name: service.name,
        description: service.description || '',
        fixedPrice: parseFloat(service.fixedPrice).toString(),
        estimatedDuration: service.estimatedDuration || '',
      });
    } else {
      setEditingService(null);
      setFormData({
        categoryId: selectedCategoryId,
        name: '',
        description: '',
        fixedPrice: '',
        estimatedDuration: '',
      });
    }
    setIsDrawerOpen(true);
  };

  // Submit Drawer Form (Create/Edit)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDrawerError(null);

    // Form Validations
    if (!formData.name.trim()) {
      setDrawerError('Service Name is required.');
      return;
    }

    const priceVal = parseFloat(formData.fixedPrice);
    if (isNaN(priceVal) || priceVal <= 0) {
      setDrawerError('Price must be greater than zero.');
      return;
    }

    try {
      setSubmitting(true);
      const token = sessionStorage.getItem('access_token');
      const url = editingService
        ? `http://localhost:3000/api/v1/admin/catalog/services/${editingService.id}`
        : 'http://localhost:3000/api/v1/admin/catalog/services';
      const method = editingService ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          setDrawerError('Service name already exists in this category.');
          return;
        }
        if (res.status === 401 || res.status === 403) {
          addToast('Session expired or access denied', 'error');
          router.push('/login/admin');
          return;
        }
        throw new Error(data.message || 'Action failed.');
      }

      if (editingService) {
        // Update in-place
        setServices((prev) =>
          prev.map((s) => (s.id === editingService.id ? data.data : s))
        );
        addToast('Service updated successfully', 'success');
      } else {
        // Prepend new service at top
        setServices((prev) => [data.data, ...prev]);
        addToast('Service created successfully', 'success');
      }

      setIsDrawerOpen(false);
    } catch (err: any) {
      setDrawerError(err.message || 'An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle active status (deactivate requires confirmation modal)
  const handleToggleActiveClick = (service: ServiceItem) => {
    if (service.isActive) {
      setDeactivatingService(service);
    } else {
      confirmToggleActive(service, true);
    }
  };

  const confirmToggleActive = async (service: ServiceItem, forceState?: boolean) => {
    const nextState = forceState !== undefined ? forceState : !service.isActive;
    try {
      const token = sessionStorage.getItem('access_token');
      const res = await fetch(`http://localhost:3000/api/v1/admin/catalog/services/${service.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`,
        },
        body: JSON.stringify({ isActive: nextState }),
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          addToast('Session expired or access denied', 'error');
          router.push('/login/admin');
          return;
        }
        throw new Error('Failed to update service state');
      }

      setServices((prev) =>
        prev.map((s) => (s.id === service.id ? { ...s, isActive: nextState } : s))
      );
      addToast(
        `Service "${service.name}" has been ${nextState ? 'activated' : 'deactivated'} successfully`,
        'success'
      );
    } catch (err: any) {
      addToast(err.message || 'Failed to update service state', 'error');
    } finally {
      setDeactivatingService(null);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 className="title-gradient" style={{ fontSize: '28px', marginBottom: '6px' }}>Service Pricing & Catalog</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Configure service items, fixed prices, and estimated durations</p>
        </div>
        <button
          className="btn-primary"
          style={{ width: 'auto', padding: '0 24px' }}
          onClick={() => openDrawer()}
        >
          + Add Service Item
        </button>
      </div>

      {/* Filter Category Select */}
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: 500 }}>Select Category:</span>
        <select
          className="form-input"
          style={{ width: '280px' }}
          value={selectedCategoryId}
          onChange={(e) => {
            setSelectedCategoryId(e.target.value);
            setFormData((prev) => ({ ...prev, categoryId: e.target.value }));
          }}
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
          <div className="alert-error">{error}</div>
          <button
            className="btn-primary"
            style={{ width: '120px', height: '40px', fontSize: '14px' }}
            onClick={() => selectedCategoryId && fetchServices(selectedCategoryId)}
          >
            Retry
          </button>
        </div>
      )}

      {/* Services Table */}
      <div className="glass-card" style={{ maxWidth: '100%', padding: '24px' }}>
        {loading ? (
          <TableSkeleton rows={5} columns={5} />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--card-border)', color: 'var(--text-muted)', fontSize: '13px', textTransform: 'uppercase' }}>
                  <th
                    style={{ padding: '12px 16px', cursor: 'pointer', userSelect: 'none' }}
                    onClick={handleSort}
                  >
                    Service Name {sortOrder === 'asc' ? '▲' : sortOrder === 'desc' ? '▼' : '⇅'}
                  </th>
                  <th style={{ padding: '12px 16px' }}>Description</th>
                  <th style={{ padding: '12px 16px' }}>Fixed Price (₹)</th>
                  <th style={{ padding: '12px 16px' }}>Est. Duration</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {getSortedServices().length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No services found in this category. Click "+ Add Service Item" to add one.
                    </td>
                  </tr>
                ) : (
                  getSortedServices().map((srv) => (
                    <tr key={srv.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '16px', fontWeight: 600 }}>{srv.name}</td>
                      <td style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '14px' }}>{srv.description || '—'}</td>
                      <td style={{ padding: '16px', fontWeight: 700, color: 'var(--primary)' }}>₹{parseFloat(srv.fixedPrice).toFixed(0)}</td>
                      <td style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '14px' }}>{srv.estimatedDuration || '—'}</td>
                      <td style={{ padding: '16px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: 600,
                            background: srv.isActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: srv.isActive ? '#10b981' : '#ef4444',
                          }}
                        >
                          {srv.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => openDrawer(srv)}
                          style={{
                            background: 'transparent',
                            border: '1px solid var(--card-border)',
                            borderRadius: '8px',
                            color: 'var(--foreground)',
                            padding: '6px 12px',
                            cursor: 'pointer',
                            fontSize: '13px',
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggleActiveClick(srv)}
                          style={{
                            background: 'transparent',
                            border: '1px solid var(--card-border)',
                            borderRadius: '8px',
                            color: srv.isActive ? '#ef4444' : '#10b981',
                            borderColor: srv.isActive ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)',
                            padding: '6px 12px',
                            cursor: 'pointer',
                            fontSize: '13px',
                          }}
                        >
                          {srv.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Slide-in Modal Drawer */}
      {isDrawerOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            justifyContent: 'flex-end',
            zIndex: 1000,
          }}
          onClick={() => setIsDrawerOpen(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '440px',
              height: '100%',
              background: 'var(--background)',
              borderLeft: '1px solid var(--card-border)',
              padding: '32px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 className="title-gradient" style={{ fontSize: '20px' }}>
                  {editingService ? 'Edit Service Item' : 'Create Service Item'}
                </h2>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '20px', cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>

              {drawerError && <div className="alert-error" style={{ marginBottom: '20px' }}>{drawerError}</div>}

              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    className="form-input"
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    required
                    disabled={!!editingService}
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Service Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Standard Deep Cleaning"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    maxLength={150}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Fixed Price (₹) *</label>
                  <input
                    type="number"
                    step="1"
                    className="form-input"
                    placeholder="e.g. 1499"
                    value={formData.fixedPrice}
                    onChange={(e) => setFormData({ ...formData, fixedPrice: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Estimated Duration</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 2-3 hours"
                    value={formData.estimatedDuration}
                    onChange={(e) => setFormData({ ...formData, estimatedDuration: e.target.value })}
                    maxLength={50}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-input"
                    style={{ height: '80px', paddingTop: '10px' }}
                    placeholder="Details about what is included in this service"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? <div className="spinner" /> : 'Save Service Item'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Deactivation */}
      <ConfirmModal
        isOpen={!!deactivatingService}
        title={`Deactivate "${deactivatingService?.name}"?`}
        message="Customers will no longer see this service."
        confirmText="Deactivate"
        onConfirm={() => {
          if (deactivatingService) {
            confirmToggleActive(deactivatingService, false);
          }
        }}
        onCancel={() => setDeactivatingService(null)}
      />
    </div>
  );
}
