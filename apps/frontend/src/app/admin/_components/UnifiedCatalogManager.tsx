'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { useToast } from './Toast';
import ConfirmModal from './ConfirmModal';
import TableSkeleton from './TableSkeleton';
import { useCatalogETag } from '../catalog/CatalogETagContext';

interface ServiceCategory {
  id: string;
  name: string;
  description: string | null;
  iconUrl: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
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



export default function UnifiedCatalogManager() {
  const router = useRouter();
  const { addToast } = useToast();
  const { etag, setEtag } = useCatalogETag();

  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingServices, setLoadingServices] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sorting states
  const [catSortOrder, setCatSortOrder] = useState<SortOrder>(null);
  const [svcSortOrder, setSvcSortOrder] = useState<SortOrder>(null);

  // Drawers open/close states
  const [isCatDrawerOpen, setIsCatDrawerOpen] = useState(false);
  const [isSvcDrawerOpen, setIsSvcDrawerOpen] = useState(false);

  // Edit objects
  const [editingCategory, setEditingCategory] = useState<ServiceCategory | null>(null);
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);

  const [submittingCat, setSubmittingCat] = useState(false);
  const [submittingSvc, setSubmittingSvc] = useState(false);

  const [catDrawerError, setCatDrawerError] = useState<string | null>(null);
  const [svcDrawerError, setSvcDrawerError] = useState<string | null>(null);

  // Forms state
  const [catFormData, setCatFormData] = useState({
    name: '',
    description: '',
    iconUrl: '',
    displayOrder: 0,
  });

  const [svcFormData, setSvcFormData] = useState({
    categoryId: '',
    name: '',
    description: '',
    fixedPrice: '',
    estimatedDuration: '',
  });

  // Deactivation confirmation modals
  const [deactivatingCategory, setDeactivatingCategory] = useState<ServiceCategory | null>(null);
  const [deactivatingService, setDeactivatingService] = useState<ServiceItem | null>(null);

  // Deactivation / activation loading states
  const [togglingCatId, setTogglingCatId] = useState<string | null>(null);
  const [togglingSvcId, setTogglingSvcId] = useState<string | null>(null);

  // 1. Fetch Categories (with ETag read)
  const fetchCategories = async () => {
    try {
      setLoadingCategories(true);
      setError(null);
      const res = await apiClient.raw('/api/v1/admin/catalog/categories', {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
        cache: 'no-store',
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          addToast('Session expired or access denied', 'error');
          router.push('/login/admin');
          return;
        }
        throw new Error(`Failed to load categories (${res.status})`);
      }

      // Read ETag from response header
      const etagHeader = res.headers.get('etag') || res.headers.get('ETag');
      if (etagHeader) {
        const cleanEtag = etagHeader.replace(/"/g, '');
        const formattedEtag = cleanEtag.startsWith('W/') ? cleanEtag : `W/"${cleanEtag}"`;
        setEtag(formattedEtag);
      }

      const data = await res.json();
      if (data.success) {
        setCategories(data.data);
        // Set default category for filtering/services form if none selected
        if (data.data.length > 0 && !selectedCategoryId) {
          setSelectedCategoryId(data.data[0].id);
          setSvcFormData((prev) => ({ ...prev, categoryId: data.data[0].id }));
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch categories');
    } finally {
      setLoadingCategories(false);
    }
  };

  // 2. Fetch Services
  const fetchServices = async (catId: string) => {
    if (!catId) return;
    try {
      setLoadingServices(true);
      const data = await apiClient.get(`/api/v1/admin/catalog/categories/${catId}/services`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
        cache: 'no-store',
      });
      if (data.success) {
        setServices(data.data);
      }
    } catch (err: any) {
      if (err.status === 401 || err.status === 403) {
        addToast('Session expired or access denied', 'error');
        router.push('/login/admin');
        return;
      }
      addToast(err.message || 'Failed to fetch services', 'error');
    } finally {
      setLoadingServices(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (selectedCategoryId) {
      fetchServices(selectedCategoryId);
    }
  }, [selectedCategoryId]);

  // Sorting categories
  const handleCatSort = () => {
    let nextOrder: SortOrder = 'asc';
    if (catSortOrder === 'asc') nextOrder = 'desc';
    else if (catSortOrder === 'desc') nextOrder = null;
    setCatSortOrder(nextOrder);
  };

  const getSortedCategories = () => {
    if (!catSortOrder) return categories;
    return [...categories].sort((a, b) => {
      const nameA = a.name.toLowerCase();
      const nameB = b.name.toLowerCase();
      if (nameA < nameB) return catSortOrder === 'asc' ? -1 : 1;
      if (nameA > nameB) return catSortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  };

  // Sorting services
  const handleSvcSort = () => {
    let nextOrder: SortOrder = 'asc';
    if (svcSortOrder === 'asc') nextOrder = 'desc';
    else if (svcSortOrder === 'desc') nextOrder = null;
    setSvcSortOrder(nextOrder);
  };

  const getSortedServices = () => {
    if (!svcSortOrder) return services;
    return [...services].sort((a, b) => {
      const nameA = a.name.toLowerCase();
      const nameB = b.name.toLowerCase();
      if (nameA < nameB) return svcSortOrder === 'asc' ? -1 : 1;
      if (nameA > nameB) return svcSortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  };

  // Drawers open handlers
  const openCatDrawer = (category: ServiceCategory | null = null) => {
    setCatDrawerError(null);
    if (category) {
      setEditingCategory(category);
      setCatFormData({
        name: category.name,
        description: category.description || '',
        iconUrl: category.iconUrl || '',
        displayOrder: category.displayOrder,
      });
    } else {
      setEditingCategory(null);
      setCatFormData({
        name: '',
        description: '',
        iconUrl: '',
        displayOrder: 0,
      });
    }
    setIsCatDrawerOpen(true);
  };

  const openSvcDrawer = (service: ServiceItem | null = null) => {
    setSvcDrawerError(null);
    if (service) {
      setEditingService(service);
      setSvcFormData({
        categoryId: service.categoryId,
        name: service.name,
        description: service.description || '',
        fixedPrice: parseFloat(service.fixedPrice).toString(),
        estimatedDuration: service.estimatedDuration || '',
      });
    } else {
      setEditingService(null);
      setSvcFormData({
        categoryId: selectedCategoryId || (categories[0]?.id || ''),
        name: '',
        description: '',
        fixedPrice: '',
        estimatedDuration: '',
      });
    }
    setIsSvcDrawerOpen(true);
  };

  // Submit category
  const handleCatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCatDrawerError(null);

    if (!catFormData.name.trim()) {
      setCatDrawerError('Category Name is required.');
      return;
    }

    if (catFormData.iconUrl) {
      const isPngOrSvg = /\.(png|svg)(\?.*)?$/i.test(catFormData.iconUrl);
      if (!isPngOrSvg) {
        setCatDrawerError('Icon URL must point to a valid PNG or SVG file.');
        return;
      }
    }

    try {
      setSubmittingCat(true);
      const path = editingCategory
        ? `/api/v1/admin/catalog/categories/${editingCategory.id}`
        : `/api/v1/admin/catalog/categories`;

      if (editingCategory) {
        await apiClient.patch(path, catFormData);
      } else {
        await apiClient.post(path, catFormData);
      }

      addToast(`Category ${editingCategory ? 'updated' : 'created'} successfully`, 'success');
      setIsCatDrawerOpen(false);
      await fetchCategories(); // refetch categories (updates ETag!)
    } catch (err: any) {
      if (err.status === 409) {
        setCatDrawerError(`Category with name "${catFormData.name}" already exists.`);
        return;
      }
      if (err.status === 401 || err.status === 403) {
        addToast('Session expired or access denied', 'error');
        router.push('/login/admin');
        return;
      }
      setCatDrawerError(err.message || 'An unexpected error occurred.');
    } finally {
      setSubmittingCat(false);
    }
  };

  // Submit service
  const handleSvcSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSvcDrawerError(null);

    if (!svcFormData.name.trim()) {
      setSvcDrawerError('Service Name is required.');
      return;
    }

    const priceVal = parseFloat(svcFormData.fixedPrice);
    if (isNaN(priceVal) || priceVal <= 0) {
      setSvcDrawerError('Price must be greater than zero.');
      return;
    }

    try {
      setSubmittingSvc(true);
      const path = editingService
        ? `/api/v1/admin/catalog/services/${editingService.id}`
        : `/api/v1/admin/catalog/services`;

      if (editingService) {
        await apiClient.patch(path, svcFormData);
      } else {
        await apiClient.post(path, svcFormData);
      }

      addToast(`Service ${editingService ? 'updated' : 'created'} successfully`, 'success');
      setIsSvcDrawerOpen(false);
      if (selectedCategoryId === svcFormData.categoryId) {
        await fetchServices(selectedCategoryId);
      } else {
        setSelectedCategoryId(svcFormData.categoryId);
      }
      await fetchCategories(); // refetch categories (updates ETag!)
    } catch (err: any) {
      if (err.status === 409) {
        setSvcDrawerError('Service name already exists in this category.');
        return;
      }
      if (err.status === 401 || err.status === 403) {
        addToast('Session expired or access denied', 'error');
        router.push('/login/admin');
        return;
      }
      setSvcDrawerError(err.message || 'An unexpected error occurred.');
    } finally {
      setSubmittingSvc(false);
    }
  };

  // Toggle active states
  const handleToggleCatActive = (category: ServiceCategory) => {
    if (category.isActive) {
      setDeactivatingCategory(category);
    } else {
      confirmToggleCatActive(category, true);
    }
  };

  const confirmToggleCatActive = async (category: ServiceCategory, forceState?: boolean) => {
    const nextState = forceState !== undefined ? forceState : !category.isActive;
    try {
      setTogglingCatId(category.id);
      await apiClient.patch(`/api/v1/admin/catalog/categories/${category.id}`, { isActive: nextState });

      // Immediately update local state map so UI updates instantly
      setCategories((prev) =>
        prev.map((c) => (c.id === category.id ? { ...c, isActive: nextState } : c))
      );

      addToast(`Category "${category.name}" has been ${nextState ? 'activated' : 'deactivated'} successfully`, 'success');
      await fetchCategories();
    } catch (err: any) {
      if (err.status === 401 || err.status === 403) {
        addToast('Session expired or access denied', 'error');
        router.push('/login/admin');
        return;
      }
      addToast(err.message || 'Failed to update category state', 'error');
    } finally {
      setTogglingCatId(null);
      setDeactivatingCategory(null);
    }
  };

  const handleToggleSvcActive = (service: ServiceItem) => {
    if (service.isActive) {
      setDeactivatingService(service);
    } else {
      confirmToggleSvcActive(service, true);
    }
  };

  const confirmToggleSvcActive = async (service: ServiceItem, forceState?: boolean) => {
    const nextState = forceState !== undefined ? forceState : !service.isActive;
    try {
      setTogglingSvcId(service.id);
      await apiClient.patch(`/api/v1/admin/catalog/services/${service.id}`, { isActive: nextState });

      // Immediately update local state map so UI updates instantly
      setServices((prev) =>
        prev.map((s) => (s.id === service.id ? { ...s, isActive: nextState } : s))
      );

      addToast(`Service "${service.name}" has been ${nextState ? 'activated' : 'deactivated'} successfully`, 'success');
      if (selectedCategoryId) {
        await fetchServices(selectedCategoryId);
      }
      await fetchCategories();
    } catch (err: any) {
      addToast(err.message || 'Failed to update service state', 'error');
    } finally {
      setTogglingSvcId(null);
      setDeactivatingService(null);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Header and Add Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="title-gradient" style={{ fontSize: '28px', marginBottom: '6px', fontWeight: 800 }}>Service Catalog Manager</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Configure catalog categories and manage positive fixed-pricing values.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            className="btn-primary"
            style={{ width: 'auto', padding: '0 20px', background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.2)' }}
            onClick={() => openCatDrawer()}
          >
            + Add Category
          </button>
          <button
            className="btn-primary"
            style={{ width: 'auto', padding: '0 20px' }}
            onClick={() => openSvcDrawer()}
          >
            + Add Service
          </button>
        </div>
      </div>

      {error && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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

      {/* Grid containing tables */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        
        {/* 1. CATEGORIES TABLE */}
        <div className="glass-card" style={{ maxWidth: '100%', width: '100%', padding: '24px', animation: 'none' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px', color: '#ffffff' }}>Service Categories</h2>
          {loadingCategories ? (
            <TableSkeleton rows={3} columns={4} />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--card-border)', color: 'var(--text-muted)', fontSize: '13px', textTransform: 'uppercase' }}>
                    <th
                      style={{ padding: '12px 16px', cursor: 'pointer', userSelect: 'none' }}
                      onClick={handleCatSort}
                    >
                      Category Name {catSortOrder === 'asc' ? '▲' : catSortOrder === 'desc' ? '▼' : '⇅'}
                    </th>
                    <th style={{ padding: '12px 16px' }}>Description</th>
                    <th style={{ padding: '12px 16px' }}>Status</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {getSortedCategories().length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No service categories found.
                      </td>
                    </tr>
                  ) : (
                    getSortedCategories().map((cat) => (
                      <tr key={cat.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '16px', fontWeight: 600, color: '#ffffff' }}>{cat.name}</td>
                        <td style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '14px' }}>{cat.description || '—'}</td>
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
                            onClick={() => openCatDrawer(cat)}
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
                            disabled={togglingCatId === cat.id}
                            onClick={() => handleToggleCatActive(cat)}
                            style={{
                              background: 'transparent',
                              border: '1px solid var(--card-border)',
                              borderRadius: '8px',
                              color: cat.isActive ? '#ef4444' : '#10b981',
                              borderColor: cat.isActive ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)',
                              padding: '6px 12px',
                              cursor: togglingCatId === cat.id ? 'not-allowed' : 'pointer',
                              fontSize: '13px',
                              opacity: togglingCatId === cat.id ? 0.7 : 1,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            {togglingCatId === cat.id && (
                              <span className="spinner" style={{ width: '12px', height: '12px' }} />
                            )}
                            {togglingCatId === cat.id
                              ? 'Processing...'
                              : cat.isActive
                              ? 'Deactivate'
                              : 'Activate'}
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

        {/* 2. SERVICES TABLE */}
        <div className="glass-card" style={{ maxWidth: '100%', width: '100%', padding: '24px', animation: 'none' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff' }}>Active Service Catalog Items</h2>
            
            {/* Filter Category Select */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: 500 }}>Select Category:</span>
              <select
                className="form-input"
                style={{ width: '220px', height: '40px' }}
                value={selectedCategoryId}
                onChange={(e) => {
                  setSelectedCategoryId(e.target.value);
                  setSvcFormData((prev) => ({ ...prev, categoryId: e.target.value }));
                }}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loadingServices ? (
            <TableSkeleton rows={4} columns={6} />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--card-border)', color: 'var(--text-muted)', fontSize: '13px', textTransform: 'uppercase' }}>
                    <th
                      style={{ padding: '12px 16px', cursor: 'pointer', userSelect: 'none' }}
                      onClick={handleSvcSort}
                    >
                      Service Name {svcSortOrder === 'asc' ? '▲' : svcSortOrder === 'desc' ? '▼' : '⇅'}
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
                        No services found in this category.
                      </td>
                    </tr>
                  ) : (
                    getSortedServices().map((srv) => (
                      <tr key={srv.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '16px', fontWeight: 600, color: '#ffffff' }}>{srv.name}</td>
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
                            onClick={() => openSvcDrawer(srv)}
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
                            disabled={togglingSvcId === srv.id}
                            onClick={() => handleToggleSvcActive(srv)}
                            style={{
                              background: 'transparent',
                              border: '1px solid var(--card-border)',
                              borderRadius: '8px',
                              color: srv.isActive ? '#ef4444' : '#10b981',
                              borderColor: srv.isActive ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)',
                              padding: '6px 12px',
                              cursor: togglingSvcId === srv.id ? 'not-allowed' : 'pointer',
                              fontSize: '13px',
                              opacity: togglingSvcId === srv.id ? 0.7 : 1,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            {togglingSvcId === srv.id && (
                              <span className="spinner" style={{ width: '12px', height: '12px' }} />
                            )}
                            {togglingSvcId === srv.id
                              ? 'Processing...'
                              : srv.isActive
                              ? 'Deactivate'
                              : 'Activate'}
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

      </div>

      {/* 3. CATEGORY DRAWER */}
      {isCatDrawerOpen && (
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
          onClick={() => setIsCatDrawerOpen(false)}
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
                <h2 className="title-gradient" style={{ fontSize: '20px', fontWeight: 700 }}>
                  {editingCategory ? 'Edit Category' : 'Create Category'}
                </h2>
                <button
                  onClick={() => setIsCatDrawerOpen(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '20px', cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>

              {catDrawerError && <div className="alert-error" style={{ marginBottom: '20px' }}>{catDrawerError}</div>}

              <form onSubmit={handleCatSubmit}>
                <div className="form-group">
                  <label className="form-label">Category Name *</label>
                  <input
                    type="text"
                    name="name"
                    className="form-input"
                    placeholder="e.g. Home Cleaning"
                    value={catFormData.name}
                    onChange={(e) => setCatFormData({ ...catFormData, name: e.target.value })}
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
                    value={catFormData.description}
                    onChange={(e) => setCatFormData({ ...catFormData, description: e.target.value })}
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
                    value={catFormData.iconUrl}
                    onChange={(e) => setCatFormData({ ...catFormData, iconUrl: e.target.value })}
                  />
                  <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '4px', fontSize: '11px' }}>
                    Validated format: PNG or SVG URLs.
                  </small>
                </div>

                <div className="form-group">
                  <label className="form-label">Display Order</label>
                  <input
                    type="number"
                    name="displayOrder"
                    className="form-input"
                    value={catFormData.displayOrder}
                    onChange={(e) => setCatFormData({ ...catFormData, displayOrder: parseInt(e.target.value, 10) || 0 })}
                  />
                </div>

                <button type="submit" className="btn-primary" disabled={submittingCat}>
                  {submittingCat ? <div className="spinner" /> : 'Save Category'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 4. SERVICE DRAWER */}
      {isSvcDrawerOpen && (
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
          onClick={() => setIsSvcDrawerOpen(false)}
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
                <h2 className="title-gradient" style={{ fontSize: '20px', fontWeight: 700 }}>
                  {editingService ? 'Edit Service Item' : 'Create Service Item'}
                </h2>
                <button
                  onClick={() => setIsSvcDrawerOpen(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '20px', cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>

              {svcDrawerError && <div className="alert-error" style={{ marginBottom: '20px' }}>{svcDrawerError}</div>}

              <form onSubmit={handleSvcSubmit}>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    name="categoryId"
                    className="form-input"
                    value={svcFormData.categoryId}
                    onChange={(e) => setSvcFormData({ ...svcFormData, categoryId: e.target.value })}
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
                    name="name"
                    className="form-input"
                    placeholder="e.g. Standard Deep Cleaning"
                    value={svcFormData.name}
                    onChange={(e) => setSvcFormData({ ...svcFormData, name: e.target.value })}
                    maxLength={150}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Fixed Price (₹) *</label>
                  <input
                    type="number"
                    step="1"
                    name="fixedPrice"
                    className="form-input"
                    placeholder="e.g. 1499"
                    value={svcFormData.fixedPrice}
                    onChange={(e) => setSvcFormData({ ...svcFormData, fixedPrice: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Estimated Duration</label>
                  <input
                    type="text"
                    name="estimatedDuration"
                    className="form-input"
                    placeholder="e.g. 2-3 hours"
                    value={svcFormData.estimatedDuration}
                    onChange={(e) => setSvcFormData({ ...svcFormData, estimatedDuration: e.target.value })}
                    maxLength={50}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    name="description"
                    className="form-input"
                    style={{ height: '80px', paddingTop: '10px' }}
                    placeholder="Details about what is included in this service"
                    value={svcFormData.description}
                    onChange={(e) => setSvcFormData({ ...svcFormData, description: e.target.value })}
                  />
                </div>

                <button type="submit" className="btn-primary" disabled={submittingSvc}>
                  {submittingSvc ? <div className="spinner" /> : 'Save Service Item'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modals */}
      <ConfirmModal
        isOpen={!!deactivatingCategory}
        isLoading={togglingCatId === deactivatingCategory?.id}
        title={`Deactivate "${deactivatingCategory?.name}"?`}
        message="Customers will no longer see this category and its associated services."
        confirmText="Deactivate"
        onConfirm={() => {
          if (deactivatingCategory) {
            confirmToggleCatActive(deactivatingCategory, false);
          }
        }}
        onCancel={() => {
          if (togglingCatId !== deactivatingCategory?.id) {
            setDeactivatingCategory(null);
          }
        }}
      />

      <ConfirmModal
        isOpen={!!deactivatingService}
        isLoading={togglingSvcId === deactivatingService?.id}
        title={`Deactivate "${deactivatingService?.name}"?`}
        message="Customers will no longer see this service."
        confirmText="Deactivate"
        onConfirm={() => {
          if (deactivatingService) {
            confirmToggleSvcActive(deactivatingService, false);
          }
        }}
        onCancel={() => {
          if (togglingSvcId !== deactivatingService?.id) {
            setDeactivatingService(null);
          }
        }}
      />

    </div>
  );
}
