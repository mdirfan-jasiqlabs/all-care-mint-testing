'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '../../_components/Toast';
import ConfirmModal from '../../_components/ConfirmModal';
import TableSkeleton from '../../_components/TableSkeleton';


interface ServiceCategory {
  id: string;
  name: string;
  description: string | null;
  iconUrl: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
}

type SortOrder = 'asc' | 'desc' | null;

export default function CategoryManagerPage() {
  const router = useRouter();
  const { addToast } = useToast();

  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sorting State
  const [sortOrder, setSortOrder] = useState<SortOrder>(null);

  // Drawer Form State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ServiceCategory | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [drawerError, setDrawerError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    iconUrl: '',
    displayOrder: 0,
  });

  // Modal State for Deactivation
  const [deactivatingCategory, setDeactivatingCategory] = useState<ServiceCategory | null>(null);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = sessionStorage.getItem('access_token');
      const res = await fetch('http://localhost:3000/api/v1/admin/catalog/categories', {
        headers: {
          'Authorization': `Bearer ${token || ''}`,
        },
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
      if (data.success) {
        setCategories(data.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Sorting Handler
  const handleSort = () => {
    let nextOrder: SortOrder = 'asc';
    if (sortOrder === 'asc') nextOrder = 'desc';
    else if (sortOrder === 'desc') nextOrder = null;
    
    setSortOrder(nextOrder);
  };

  const getSortedCategories = () => {
    if (!sortOrder) return categories;
    return [...categories].sort((a, b) => {
      const nameA = a.name.toLowerCase();
      const nameB = b.name.toLowerCase();
      if (nameA < nameB) return sortOrder === 'asc' ? -1 : 1;
      if (nameA > nameB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  };

  // Open Drawer in Create/Edit mode
  const openDrawer = (category: ServiceCategory | null = null) => {
    setDrawerError(null);
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        description: category.description || '',
        iconUrl: category.iconUrl || '',
        displayOrder: category.displayOrder,
      });
    } else {
      setEditingCategory(null);
      setFormData({
        name: '',
        description: '',
        iconUrl: '',
        displayOrder: 0,
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
      setDrawerError('Category Name is required.');
      return;
    }

    if (formData.iconUrl) {
      const isPngOrSvg = /\.(png|svg)(\?.*)?$/i.test(formData.iconUrl);
      if (!isPngOrSvg) {
        setDrawerError('Icon URL must point to a valid PNG or SVG file.');
        return;
      }
    }

    try {
      setSubmitting(true);
      const token = sessionStorage.getItem('access_token');
      const url = editingCategory
        ? `http://localhost:3000/api/v1/admin/catalog/categories/${editingCategory.id}`
        : 'http://localhost:3000/api/v1/admin/catalog/categories';
      const method = editingCategory ? 'PATCH' : 'POST';

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
          setDrawerError(`Category with name "${formData.name}" already exists.`);
          return;
        }
        if (res.status === 401 || res.status === 403) {
          addToast('Session expired or access denied', 'error');
          router.push('/login/admin');
          return;
        }
        throw new Error(data.message || 'Action failed.');
      }

      if (editingCategory) {
        // Update in-place
        setCategories((prev) =>
          prev.map((c) => (c.id === editingCategory.id ? data.data : c))
        );
        addToast('Category updated successfully', 'success');
      } else {
        // Prepend new category at top
        setCategories((prev) => [data.data, ...prev]);
        addToast('Category created successfully', 'success');
      }

      setIsDrawerOpen(false);
    } catch (err: any) {
      setDrawerError(err.message || 'An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle active status (deactivate requires confirmation modal)
  const handleToggleActiveClick = (category: ServiceCategory) => {
    if (category.isActive) {
      setDeactivatingCategory(category);
    } else {
      confirmToggleActive(category, true);
    }
  };

  const confirmToggleActive = async (category: ServiceCategory, forceState?: boolean) => {
    const nextState = forceState !== undefined ? forceState : !category.isActive;
    try {
      const token = sessionStorage.getItem('access_token');
      const res = await fetch(`http://localhost:3000/api/v1/admin/catalog/categories/${category.id}`, {
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
        throw new Error('Failed to update category state');
      }

      setCategories((prev) =>
        prev.map((c) => (c.id === category.id ? { ...c, isActive: nextState } : c))
      );
      addToast(
        `Category "${category.name}" has been ${nextState ? 'activated' : 'deactivated'} successfully`,
        'success'
      );
    } catch (err: any) {
      addToast(err.message || 'Failed to update category state', 'error');
    } finally {
      setDeactivatingCategory(null);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 className="title-gradient" style={{ fontSize: '28px', marginBottom: '6px' }}>Service Categories</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Manage domain service categories, sorting orders, and visibility</p>
        </div>
        <button
          className="btn-primary"
          style={{ width: 'auto', padding: '0 24px' }}
          onClick={() => openDrawer()}
        >
          + Add Category
        </button>
      </div>

      {error && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
          <div className="alert-error">{error}</div>
          <button
            className="btn-primary"
            style={{ width: '120px', height: '40px', fontSize: '14px' }}
            onClick={fetchCategories}
          >
            Retry
          </button>
        </div>
      )}

      {/* Categories Table */}
      <div className="glass-card" style={{ maxWidth: '100%', padding: '24px' }}>
        {loading ? (
          <TableSkeleton rows={5} columns={4} />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--card-border)', color: 'var(--text-muted)', fontSize: '13px', textTransform: 'uppercase' }}>
                  <th
                    style={{ padding: '12px 16px', cursor: 'pointer', userSelect: 'none' }}
                    onClick={handleSort}
                  >
                    Category Name {sortOrder === 'asc' ? '▲' : sortOrder === 'desc' ? '▼' : '⇅'}
                  </th>
                  <th style={{ padding: '12px 16px' }}>Icon</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {getSortedCategories().length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No categories found. Click "+ Add Category" to create one.
                    </td>
                  </tr>
                ) : (
                  getSortedCategories().map((cat) => (
                    <tr key={cat.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '16px', fontWeight: 500 }}>{cat.name}</td>
                      <td style={{ padding: '16px' }}>
                        {cat.iconUrl ? (
                          <img
                            src={cat.iconUrl}
                            alt={cat.name}
                            style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '4px',
                              objectFit: 'contain',
                              backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            }}
                          />
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>No Icon</span>
                        )}
                      </td>
                      <td style={{ padding: '16px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: 600,
                            background: cat.isActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: cat.isActive ? '#10b981' : '#ef4444',
                          }}
                        >
                          {cat.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => openDrawer(cat)}
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
                          onClick={() => handleToggleActiveClick(cat)}
                          style={{
                            background: 'transparent',
                            border: '1px solid var(--card-border)',
                            borderRadius: '8px',
                            color: cat.isActive ? '#ef4444' : '#10b981',
                            borderColor: cat.isActive ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)',
                            padding: '6px 12px',
                            cursor: 'pointer',
                            fontSize: '13px',
                          }}
                        >
                          {cat.isActive ? 'Deactivate' : 'Activate'}
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
                  {editingCategory ? 'Edit Category' : 'Create Category'}
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
                  <label className="form-label">Category Name *</label>
                  <input
                    type="text"
                    name="name"
                    className="form-input"
                    placeholder="e.g. Home Cleaning"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    maxLength={60}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    name="description"
                    className="form-input"
                    style={{ height: '80px', paddingTop: '10px' }}
                    placeholder="Brief details about services in this category"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    maxLength={255}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Icon URL</label>
                  <input
                    type="text"
                    name="iconUrl"
                    className="form-input"
                    placeholder="e.g. /icons/cleaning.png"
                    value={formData.iconUrl}
                    onChange={(e) => setFormData({ ...formData, iconUrl: e.target.value })}
                  />
                  <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                    Validated format: PNG or SVG URLs.
                  </small>
                </div>

                <div className="form-group">
                  <label className="form-label">Display Order</label>
                  <input
                    type="number"
                    name="displayOrder"
                    className="form-input"
                    value={formData.displayOrder}
                    onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value, 10) || 0 })}
                  />
                </div>

                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? <div className="spinner" /> : 'Save Category'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Deactivation */}
      <ConfirmModal
        isOpen={!!deactivatingCategory}
        title={`Deactivate "${deactivatingCategory?.name}"?`}
        message="Customers will no longer see this category."
        confirmText="Deactivate"
        onConfirm={() => {
          if (deactivatingCategory) {
            confirmToggleActive(deactivatingCategory, false);
          }
        }}
        onCancel={() => setDeactivatingCategory(null)}
      />
    </div>
  );
}
