'use client';

import React, { useState, useEffect } from 'react';

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

export default function PricingManagerPage() {
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    categoryId: '',
    name: '',
    description: '',
    fixedPrice: '',
    estimatedDuration: '',
  });

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const res = await fetch('http://localhost:3000/api/v1/admin/catalog/categories', {
          headers: { 'Authorization': `Bearer ${token || ''}` },
        });
        const data = await res.json();
        if (data.success && data.data.length > 0) {
          setCategories(data.data);
          setSelectedCategoryId(data.data[0].id);
          setFormData((prev) => ({ ...prev, categoryId: data.data[0].id }));
        }
      } catch (err) {
        console.error('Failed to fetch categories:', err);
      }
    };
    fetchCategories();
  }, []);

  const fetchServices = async (catId: string) => {
    if (!catId) return;
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      const res = await fetch(`http://localhost:3000/api/v1/admin/catalog/categories/${catId}/services`, {
        headers: { 'Authorization': `Bearer ${token || ''}` },
      });
      const data = await res.json();
      if (data.success) {
        setServices(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch services:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCategoryId) {
      fetchServices(selectedCategoryId);
    }
  }, [selectedCategoryId]);

  const handleToggleServiceActive = async (service: ServiceItem) => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`http://localhost:3000/api/v1/admin/catalog/services/${service.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`,
        },
        body: JSON.stringify({ isActive: !service.isActive }),
      });
      if (res.ok) {
        setServices((prev) =>
          prev.map((s) => (s.id === service.id ? { ...s, isActive: !s.isActive } : s)),
        );
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.fixedPrice) return;

    try {
      setSubmitting(true);
      const token = localStorage.getItem('access_token');
      const res = await fetch('http://localhost:3000/api/v1/admin/catalog/services', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || data.message || 'Failed to create service');
      }

      setServices((prev) => [...prev, data.data]);
      setIsDrawerOpen(false);
      setFormData((prev) => ({
        ...prev,
        name: '',
        description: '',
        fixedPrice: '',
        estimatedDuration: '',
      }));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 className="title-gradient" style={{ fontSize: '28px', marginBottom: '6px' }}>Service Pricing & Catalog</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Configure service items, fixed prices, and estimated durations</p>
        </div>
        <button
          className="btn-primary"
          style={{ width: 'auto', padding: '0 24px' }}
          onClick={() => setIsDrawerOpen(true)}
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

      {/* Services Table */}
      <div className="glass-card" style={{ maxWidth: '100%', padding: '24px' }}>
        {loading ? (
          <div style={{ padding: '32px', textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto' }} />
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--card-border)', color: 'var(--text-muted)', fontSize: '13px', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 16px' }}>Service Name</th>
                <th style={{ padding: '12px 16px' }}>Description</th>
                <th style={{ padding: '12px 16px' }}>Fixed Price ($)</th>
                <th style={{ padding: '12px 16px' }}>Est. Duration</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {services.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No services found in this category. Click "+ Add Service Item" to add one.
                  </td>
                </tr>
              ) : (
                services.map((srv) => (
                  <tr key={srv.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '16px', fontWeight: 600 }}>{srv.name}</td>
                    <td style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '14px' }}>{srv.description || '—'}</td>
                    <td style={{ padding: '16px', fontWeight: 700, color: 'var(--primary)' }}>${srv.fixedPrice}</td>
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
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <button
                        onClick={() => handleToggleServiceActive(srv)}
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
                        {srv.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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
        >
          <div
            style={{
              width: '440px',
              height: '100%',
              background: 'var(--background)',
              borderLeft: '1px solid var(--card-border)',
              padding: '32px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 className="title-gradient" style={{ fontSize: '20px' }}>Create Service Item</h2>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '20px', cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateService}>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    className="form-input"
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    required
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
                  <label className="form-label">Fixed Price ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    placeholder="e.g. 1499.00"
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
    </div>
  );
}
