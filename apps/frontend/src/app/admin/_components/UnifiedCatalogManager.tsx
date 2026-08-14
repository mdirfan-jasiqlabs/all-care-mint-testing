'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { useToast } from './Toast';
import ConfirmModal from './ConfirmModal';
import TableSkeleton from './TableSkeleton';
import { useCatalogETag } from '../catalog/CatalogETagContext';
import {
  CheckCircle2,
  Plus,
  Search,
  Folder,
  ShieldCheck,
  PauseCircle,
  Package,
  Edit2,
  Play,
  Square,
  Sparkles,
  Zap,
  Droplet,
  Paintbrush,
  Wrench,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
} from 'lucide-react';

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
type StatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

export default function UnifiedCatalogManager() {
  const router = useRouter();
  const pathname = usePathname() || '';
  const { addToast } = useToast();
  const { etag, setEtag } = useCatalogETag();

  // Active Tab state: categories vs services (pricing)
  const [activeTab, setActiveTab] = useState<'categories' | 'services'>(
    pathname.includes('pricing') ? 'services' : 'categories'
  );

  useEffect(() => {
    if (pathname.includes('pricing')) {
      setActiveTab('services');
    } else if (pathname.includes('categories')) {
      setActiveTab('categories');
    }
  }, [pathname]);

  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingServices, setLoadingServices] = useState(false);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);

  // Search & Filter states
  const [catSearchTerm, setCatSearchTerm] = useState('');
  const [svcSearchTerm, setSvcSearchTerm] = useState('');
  const [catStatusFilter, setCatStatusFilter] = useState<StatusFilter>('ALL');
  const [svcStatusFilter, setSvcStatusFilter] = useState<StatusFilter>('ALL');
  const [catCategoryFilter, setCatCategoryFilter] = useState<string>('ALL');

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

  // Performance refs for request aborts & in-memory tab caching
  const categoriesAbortControllerRef = useRef<AbortController | null>(null);
  const servicesAbortControllerRef = useRef<AbortController | null>(null);
  const servicesCacheRef = useRef<Map<string, ServiceItem[]>>(new Map());

  // 1. Fetch Categories (with ETag & AbortController support)
  const fetchCategories = async () => {
    if (categoriesAbortControllerRef.current) {
      categoriesAbortControllerRef.current.abort();
    }
    const controller = new AbortController();
    categoriesAbortControllerRef.current = controller;

    try {
      setLoadingCategories(true);
      setError(null);
      const token =
        typeof window !== 'undefined'
          ? sessionStorage.getItem('access_token') ||
            localStorage.getItem('access_token') ||
            localStorage.getItem('admin_token')
          : null;
      const headers: Record<string, string> = {
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      if (etag) {
        headers['If-None-Match'] = etag;
      }

      const res = await apiClient.raw('/api/v1/admin/catalog/categories', {
        headers,
        cache: 'no-store',
        signal: controller.signal,
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          addToast('Session expired or access denied', 'error');
          router.push('/login/admin');
          return;
        }
        if (res.status === 304) {
          // Content Not Modified - Reuse existing cached categories
          setLoadingCategories(false);
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
        if (data.data.length > 0 && !selectedCategoryId) {
          setSelectedCategoryId(data.data[0].id);
          setSvcFormData((prev) => ({ ...prev, categoryId: data.data[0].id }));
        }

        // Pre-fetch service counts for all categories
        Promise.all(
          data.data.map(async (cat: ServiceCategory) => {
            try {
              const resSvcs = await apiClient.get(`/api/v1/admin/catalog/categories/${cat.id}/services`, {
                headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
                cache: 'no-store',
              });
              if (resSvcs && resSvcs.success && Array.isArray(resSvcs.data)) {
                servicesCacheRef.current.set(cat.id, resSvcs.data);
                return { catId: cat.id, count: resSvcs.data.length };
              }
            } catch {
              return { catId: cat.id, count: 0 };
            }
            return { catId: cat.id, count: 0 };
          })
        ).then((results) => {
          const countsMap: Record<string, number> = {};
          results.forEach((item) => {
            if (item) countsMap[item.catId] = item.count;
          });
          setCategoryCounts((prev) => ({ ...prev, ...countsMap }));
        });
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setError(err.message || 'Failed to fetch categories');
    } finally {
      setLoadingCategories(false);
    }
  };

  // 2. Fetch Services (with in-memory tab caching & AbortController support)
  const fetchServices = async (catId: string, forceRefetch = false) => {
    if (!catId) return;

    if (!forceRefetch && servicesCacheRef.current.has(catId)) {
      const cached = servicesCacheRef.current.get(catId)!;
      setServices(cached);
      setCategoryCounts((prev) => ({ ...prev, [catId]: cached.length }));
      setLoadingServices(false);
      return;
    }

    if (servicesAbortControllerRef.current) {
      servicesAbortControllerRef.current.abort();
    }
    const controller = new AbortController();
    servicesAbortControllerRef.current = controller;

    try {
      setLoadingServices(true);
      const data = await apiClient.get(`/api/v1/admin/catalog/categories/${catId}/services`, {
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
        cache: 'no-store',
        signal: controller.signal,
      });
      if (data.success) {
        setServices(data.data);
        servicesCacheRef.current.set(catId, data.data);
        setCategoryCounts((prev) => ({ ...prev, [catId]: data.data.length }));
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
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
    return () => {
      if (categoriesAbortControllerRef.current) categoriesAbortControllerRef.current.abort();
      if (servicesAbortControllerRef.current) servicesAbortControllerRef.current.abort();
    };
  }, []);

  useEffect(() => {
    if (selectedCategoryId) {
      fetchServices(selectedCategoryId);
    }
  }, [selectedCategoryId]);

  // Tab switching handler
  const handleTabChange = (tab: 'categories' | 'services') => {
    setActiveTab(tab);
    if (tab === 'categories') {
      router.push('/admin/catalog/categories');
    } else {
      router.push('/admin/catalog/pricing');
    }
  };

  // Sorting categories
  const handleCatSort = () => {
    let nextOrder: SortOrder = 'asc';
    if (catSortOrder === 'asc') nextOrder = 'desc';
    else if (catSortOrder === 'desc') nextOrder = null;
    setCatSortOrder(nextOrder);
  };

  const getFilteredAndSortedCategories = () => {
    let list = [...categories];

    // Filter search
    if (catSearchTerm.trim()) {
      const term = catSearchTerm.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(term) ||
          (c.description && c.description.toLowerCase().includes(term))
      );
    }

    // Filter status
    if (catStatusFilter === 'ACTIVE') {
      list = list.filter((c) => c.isActive);
    } else if (catStatusFilter === 'INACTIVE') {
      list = list.filter((c) => !c.isActive);
    }

    // Filter category selector dropdown
    if (catCategoryFilter && catCategoryFilter !== 'ALL') {
      list = list.filter((c) => c.id === catCategoryFilter);
    }

    // Sort
    if (catSortOrder) {
      list.sort((a, b) => {
        const nameA = a.name.toLowerCase();
        const nameB = b.name.toLowerCase();
        if (nameA < nameB) return catSortOrder === 'asc' ? -1 : 1;
        if (nameA > nameB) return catSortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return list;
  };

  // Sorting services
  const handleSvcSort = () => {
    let nextOrder: SortOrder = 'asc';
    if (svcSortOrder === 'asc') nextOrder = 'desc';
    else if (svcSortOrder === 'desc') nextOrder = null;
    setSvcSortOrder(nextOrder);
  };

  const getFilteredAndSortedServices = () => {
    let list = [...services];

    // Filter search
    if (svcSearchTerm.trim()) {
      const term = svcSearchTerm.toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(term) ||
          (s.description && s.description.toLowerCase().includes(term))
      );
    }

    // Filter status
    if (svcStatusFilter === 'ACTIVE') {
      list = list.filter((s) => s.isActive);
    } else if (svcStatusFilter === 'INACTIVE') {
      list = list.filter((s) => !s.isActive);
    }

    // Sort
    if (svcSortOrder) {
      list.sort((a, b) => {
        const nameA = a.name.toLowerCase();
        const nameB = b.name.toLowerCase();
        if (nameA < nameB) return svcSortOrder === 'asc' ? -1 : 1;
        if (nameA > nameB) return svcSortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return list;
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
      servicesCacheRef.current.clear();
      await fetchCategories();
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
        const { categoryId, ...updatePayload } = svcFormData;
        await apiClient.patch(path, updatePayload);
      } else {
        await apiClient.post(path, svcFormData);
      }

      addToast(`Service ${editingService ? 'updated' : 'created'} successfully`, 'success');
      setIsSvcDrawerOpen(false);
      servicesCacheRef.current.delete(svcFormData.categoryId);
      if (selectedCategoryId === svcFormData.categoryId) {
        await fetchServices(selectedCategoryId, true);
      } else {
        setSelectedCategoryId(svcFormData.categoryId);
      }
      await fetchCategories();
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

      setCategories((prev) =>
        prev.map((c) => (c.id === category.id ? { ...c, isActive: nextState } : c))
      );

      addToast(`Category "${category.name}" has been ${nextState ? 'activated' : 'deactivated'} successfully`, 'success');
      servicesCacheRef.current.clear();
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

      setServices((prev) =>
        prev.map((s) => (s.id === service.id ? { ...s, isActive: nextState } : s))
      );

      addToast(`Service "${service.name}" has been ${nextState ? 'activated' : 'deactivated'} successfully`, 'success');
      if (selectedCategoryId) {
        servicesCacheRef.current.delete(selectedCategoryId);
        await fetchServices(selectedCategoryId, true);
      }
      await fetchCategories();
    } catch (err: any) {
      addToast(err.message || 'Failed to update service state', 'error');
    } finally {
      setTogglingSvcId(null);
      setDeactivatingService(null);
    }
  };

  // Category Icon styling generator
  const getCategoryIconDetails = (name: string, index: number) => {
    const palette = [
      { bg: 'rgba(139, 92, 246, 0.15)', border: 'rgba(139, 92, 246, 0.3)', color: '#a78bfa', Icon: Sparkles },
      { bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.3)', color: '#34d399', Icon: Folder },
      { bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.3)', color: '#60a5fa', Icon: Droplet },
      { bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.3)', color: '#fbbf24', Icon: Zap },
      { bg: 'rgba(236, 72, 153, 0.15)', border: 'rgba(236, 72, 153, 0.3)', color: '#f472b6', Icon: Paintbrush },
      { bg: 'rgba(20, 184, 166, 0.15)', border: 'rgba(20, 184, 166, 0.3)', color: '#2dd4bf', Icon: Wrench },
    ];

    const lower = name.toLowerCase();
    if (lower.includes('clean')) return { bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.3)', color: '#34d399', Icon: Sparkles };
    if (lower.includes('ac') || lower.includes('repair')) return { bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.3)', color: '#fbbf24', Icon: Zap };
    if (lower.includes('plumb')) return { bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.3)', color: '#60a5fa', Icon: Droplet };
    if (lower.includes('paint')) return { bg: 'rgba(236, 72, 153, 0.15)', border: 'rgba(236, 72, 153, 0.3)', color: '#f472b6', Icon: Paintbrush };
    if (lower.includes('electric')) return { bg: 'rgba(139, 92, 246, 0.15)', border: 'rgba(139, 92, 246, 0.3)', color: '#a78bfa', Icon: Zap };

    return palette[index % palette.length];
  };

  // Memoized KPI Computations
  const { totalCategories, activeCategories, inactiveCategories } = useMemo(() => {
    let active = 0;
    let inactive = 0;
    for (let i = 0; i < categories.length; i++) {
      if (categories[i].isActive) active++;
      else inactive++;
    }
    return {
      totalCategories: categories.length,
      activeCategories: active,
      inactiveCategories: inactive,
    };
  }, [categories]);

  const totalServices = useMemo(() => {
    const counts = Object.values(categoryCounts);
    if (counts.length > 0) {
      return counts.reduce((sum, val) => sum + val, 0);
    }
    return services.length;
  }, [categoryCounts, services.length]);

  const filteredCategories = useMemo(
    () => getFilteredAndSortedCategories(),
    [categories, catSearchTerm, catStatusFilter, catCategoryFilter, catSortOrder]
  );

  const filteredServices = useMemo(
    () => getFilteredAndSortedServices(),
    [services, svcSearchTerm, svcStatusFilter, svcSortOrder]
  );

  return (
    <div style={{ maxWidth: '100%', width: '100%', display: 'flex', flexDirection: 'column', gap: '16px', color: '#ffffff' }}>
      
      {/* 1. Page Header & Primary Action CTA */}
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
            {activeTab === 'categories' ? <Folder size={20} /> : <Package size={20} />}
          </div>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em', margin: 0 }}>
              Service Catalog Manager
            </h1>
            <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '2px', margin: 0, fontWeight: 400 }}>
              Manage service categories, configure fixed pricing, and adjust operational catalog structures.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {activeTab === 'categories' ? (
            <button
              id="btn-add-category"
              onClick={() => openCatDrawer()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '8px',
                backgroundColor: '#10b981',
                color: '#020617',
                fontWeight: 700,
                fontSize: '12px',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              className="hover:bg-[#34d399]"
            >
              <Plus size={15} />
              <span>Add Category</span>
            </button>
          ) : (
            <button
              id="btn-add-service"
              onClick={() => openSvcDrawer()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '8px',
                backgroundColor: '#10b981',
                color: '#020617',
                fontWeight: 700,
                fontSize: '12px',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              className="hover:bg-[#34d399]"
            >
              <Plus size={15} />
              <span>Add Service</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          gap: '24px',
          paddingBottom: '2px',
        }}
      >
        <button
          id="tab-categories"
          onClick={() => handleTabChange('categories')}
          style={{
            padding: '8px 4px 10px 4px',
            fontSize: '13px',
            fontWeight: activeTab === 'categories' ? 700 : 500,
            color: activeTab === 'categories' ? '#f8fafc' : '#94a3b8',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'categories' ? '2px solid #10b981' : '2px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
          className="hover:text-slate-200"
        >
          <span>Categories</span>
        </button>
        <button
          id="tab-services"
          onClick={() => handleTabChange('services')}
          style={{
            padding: '8px 4px 10px 4px',
            fontSize: '13px',
            fontWeight: activeTab === 'services' ? 700 : 500,
            color: activeTab === 'services' ? '#f8fafc' : '#94a3b8',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'services' ? '2px solid #10b981' : '2px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
          className="hover:text-slate-200"
        >
          <span>Services & Pricing</span>
        </button>
      </div>

      {/* Error Banner if API error occurs */}
      {error && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="alert-error" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', padding: '12px 16px', borderRadius: '10px', fontSize: '13px' }}>
            {error}
          </div>
          <button
            className="btn-primary"
            style={{ width: '120px', height: '36px', fontSize: '12px', fontWeight: 700 }}
            onClick={fetchCategories}
          >
            Retry
          </button>
        </div>
      )}

      {/* 3. Summary / 4 Equal Height KPI Cards (120px height) */}
      {loadingCategories ? (
        <CatalogKpiSkeleton />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gap: '12px',
            width: '100%',
          }}
        >
          {/* KPI 1: Total Categories */}
          <div
            style={{
              backgroundColor: '#090d16',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '12px 14px',
              height: '120px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              boxSizing: 'border-box',
              minWidth: 0,
            }}
          >
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#10b981',
                flexShrink: 0,
              }}
            >
              <Folder size={18} />
            </div>
            <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#f8fafc', lineHeight: 1.1 }}>
                {totalCategories}
              </div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#e2e8f0', marginTop: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Total Categories
              </div>
              <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                All categories in catalog
              </div>
            </div>
          </div>

          {/* KPI 2: Active Categories */}
          <div
            style={{
              backgroundColor: '#090d16',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '12px 14px',
              height: '120px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              boxSizing: 'border-box',
              minWidth: 0,
            }}
          >
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                backgroundColor: 'rgba(59, 130, 246, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#60a5fa',
                flexShrink: 0,
              }}
            >
              <ShieldCheck size={18} />
            </div>
            <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#f8fafc', lineHeight: 1.1 }}>
                {activeCategories}
              </div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#e2e8f0', marginTop: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Active Categories
              </div>
              <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Currently active
              </div>
            </div>
          </div>

          {/* KPI 3: Inactive Categories */}
          <div
            style={{
              backgroundColor: '#090d16',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '12px 14px',
              height: '120px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              boxSizing: 'border-box',
              minWidth: 0,
            }}
          >
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                backgroundColor: 'rgba(245, 158, 11, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fbbf24',
                flexShrink: 0,
              }}
            >
              <PauseCircle size={18} />
            </div>
            <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#f8fafc', lineHeight: 1.1 }}>
                {inactiveCategories}
              </div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#e2e8f0', marginTop: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Inactive Categories
              </div>
              <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Not active
              </div>
            </div>
          </div>

          {/* KPI 4: Total Services */}
          <div
            style={{
              backgroundColor: '#090d16',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '12px 14px',
              height: '120px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              boxSizing: 'border-box',
              minWidth: 0,
            }}
          >
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                backgroundColor: 'rgba(168, 85, 247, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#c084fc',
                flexShrink: 0,
              }}
            >
              <Package size={18} />
            </div>
            <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#f8fafc', lineHeight: 1.1 }}>
                {totalServices}
              </div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#e2e8f0', marginTop: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Total Services
              </div>
              <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Across catalog
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. MAIN CATALOG MANAGER TABLE CARD */}
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
              {activeTab === 'categories' ? 'Catalog Categories' : 'Services & Pricing'}
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
              {activeTab === 'categories' ? filteredCategories.length : filteredServices.length} total
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', flex: '1', justifyContent: 'flex-end' }}>
            {/* Search Input */}
            <div style={{ position: 'relative', width: '100%', maxWidth: '280px' }}>
              <Search
                size={14}
                style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}
              />
              <input
                type="text"
                placeholder={activeTab === 'categories' ? 'Search categories...' : 'Search services...'}
                value={activeTab === 'categories' ? catSearchTerm : svcSearchTerm}
                onChange={(e) =>
                  activeTab === 'categories'
                    ? setCatSearchTerm(e.target.value)
                    : setSvcSearchTerm(e.target.value)
                }
                style={{
                  width: '100%',
                  backgroundColor: '#090d16',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '8px',
                  padding: '7px 28px 7px 32px',
                  color: '#f8fafc',
                  fontSize: '12px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                className="focus:border-[#10b981]"
              />
              {(activeTab === 'categories' ? catSearchTerm : svcSearchTerm) && (
                <button
                  onClick={() =>
                    activeTab === 'categories' ? setCatSearchTerm('') : setSvcSearchTerm('')
                  }
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

            {/* Category Dropdown Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Category:</span>
              {activeTab === 'categories' ? (
                <select
                  id="select-category-filter-cat-tab"
                  value={catCategoryFilter}
                  onChange={(e) => setCatCategoryFilter(e.target.value)}
                  style={{
                    backgroundColor: '#090d16',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '8px',
                    padding: '6px 10px',
                    color: '#f8fafc',
                    fontSize: '12px',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="ALL" style={{ backgroundColor: '#090d16', color: '#ffffff' }}>
                    All Categories
                  </option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id} style={{ backgroundColor: '#090d16', color: '#ffffff' }}>
                      {c.name}
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  id="select-category-filter-svc-tab"
                  value={selectedCategoryId}
                  onChange={(e) => {
                    setSelectedCategoryId(e.target.value);
                    setSvcFormData((prev) => ({ ...prev, categoryId: e.target.value }));
                  }}
                  style={{
                    backgroundColor: '#090d16',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '8px',
                    padding: '6px 10px',
                    color: '#f8fafc',
                    fontSize: '12px',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id} style={{ backgroundColor: '#090d16', color: '#ffffff' }}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Status Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Filter size={13} style={{ color: '#64748b' }} />
              <select
                value={activeTab === 'categories' ? catStatusFilter : svcStatusFilter}
                onChange={(e) => {
                  const val = e.target.value as StatusFilter;
                  if (activeTab === 'categories') setCatStatusFilter(val);
                  else setSvcStatusFilter(val);
                }}
                style={{
                  backgroundColor: '#090d16',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '8px',
                  padding: '6px 10px',
                  color: '#f8fafc',
                  fontSize: '12px',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="ALL" style={{ backgroundColor: '#090d16' }}>All Status</option>
                <option value="ACTIVE" style={{ backgroundColor: '#090d16' }}>Active Only</option>
                <option value="INACTIVE" style={{ backgroundColor: '#090d16' }}>Inactive Only</option>
              </select>
            </div>
          </div>
        </div>

        {/* 5. TAB CONTENT: CATEGORIES VIEW */}
        {activeTab === 'categories' && (
          <div>
            {loadingCategories ? (
              <div style={{ padding: '16px' }}>
                <TableSkeleton rows={5} columns={5} />
              </div>
            ) : (
              <div style={{ overflowX: 'auto', width: '100%' }}>
                <table style={{ width: '100%', tableLayout: 'auto', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
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
                      <th
                        style={{ padding: '10px 12px', width: '30%', cursor: 'pointer', userSelect: 'none' }}
                        onClick={handleCatSort}
                      >
                        CATEGORY NAME {catSortOrder === 'asc' ? '▲' : catSortOrder === 'desc' ? '▼' : '⇅'}
                      </th>
                      <th style={{ padding: '10px 12px', width: '35%' }}>DESCRIPTION</th>
                      <th style={{ padding: '10px 12px', width: '12%', textAlign: 'center', whiteSpace: 'nowrap' }}>SERVICES</th>
                      <th style={{ padding: '10px 12px', width: '11%', whiteSpace: 'nowrap' }}>STATUS</th>
                      <th style={{ padding: '10px 12px', width: '12%', textAlign: 'right', whiteSpace: 'nowrap' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCategories.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: '36px 12px', textAlign: 'center', color: '#64748b' }}>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: '#94a3b8', marginBottom: '2px' }}>
                            No categories found
                          </div>
                          <div style={{ fontSize: '12px' }}>
                            Try clearing your search term or status filter.
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredCategories.map((cat, idx) => {
                        const iconStyle = getCategoryIconDetails(cat.name, idx);
                        const IconComp = iconStyle.Icon;

                        return (
                          <tr
                            key={cat.id}
                            style={{
                              borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                              transition: 'background-color 0.12s ease',
                            }}
                            className="hover:bg-[rgba(255,255,255,0.02)]"
                          >
                            {/* Category Name with Styled Icon Box */}
                            <td style={{ padding: '10px 12px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                                <div
                                  style={{
                                    width: '28px',
                                    height: '28px',
                                    borderRadius: '7px',
                                    backgroundColor: iconStyle.bg,
                                    border: `1px solid ${iconStyle.border}`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: iconStyle.color,
                                    flexShrink: 0,
                                  }}
                                >
                                  <IconComp size={14} />
                                </div>
                                <div style={{ minWidth: 0, overflow: 'hidden' }}>
                                  <span
                                    style={{
                                      fontWeight: 700,
                                      color: '#f8fafc',
                                      fontSize: '12px',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                      display: 'block',
                                    }}
                                    title={cat.name}
                                  >
                                    {cat.name}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Description */}
                            <td style={{ padding: '10px 12px', color: '#94a3b8', fontSize: '12px' }}>
                              <span
                                style={{
                                  display: 'block',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  maxWidth: '300px',
                                }}
                                title={cat.description || ''}
                              >
                                {cat.description || '—'}
                              </span>
                            </td>

                            {/* Services Count Pill */}
                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                                  border: '1px solid rgba(255, 255, 255, 0.08)',
                                  color: '#e2e8f0',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                }}
                              >
                                {categoryCounts[cat.id] !== undefined
                                  ? categoryCounts[cat.id]
                                  : (servicesCacheRef.current.get(cat.id)
                                      ? servicesCacheRef.current.get(cat.id)!.length
                                      : (selectedCategoryId === cat.id ? services.length : 0))}
                              </span>
                            </td>

                            {/* Status Badge Pill */}
                            <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  padding: '3px 8px',
                                  borderRadius: '9999px',
                                  fontSize: '10px',
                                  fontWeight: 800,
                                  letterSpacing: '0.04em',
                                  textTransform: 'uppercase',
                                  backgroundColor: cat.isActive ? 'rgba(16, 185, 129, 0.14)' : 'rgba(239, 68, 68, 0.14)',
                                  border: `1px solid ${cat.isActive ? 'rgba(52, 211, 153, 0.28)' : 'rgba(248, 113, 113, 0.28)'}`,
                                  color: cat.isActive ? '#34d399' : '#f87171',
                                }}
                              >
                                {cat.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </td>

                            {/* Action Buttons */}
                            <td style={{ padding: '10px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                                <button
                                  onClick={() => openCatDrawer(cat)}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '4px 8px',
                                    borderRadius: '6px',
                                    backgroundColor: 'rgba(255, 255, 255, 0.04)',
                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                    color: '#e2e8f0',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                  }}
                                  className="hover:bg-[rgba(255,255,255,0.08)]"
                                >
                                  <Edit2 size={12} />
                                  <span>Edit</span>
                                </button>

                                <button
                                  disabled={togglingCatId === cat.id}
                                  onClick={() => handleToggleCatActive(cat)}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '4px 8px',
                                    borderRadius: '6px',
                                    backgroundColor: cat.isActive ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                    border: `1px solid ${cat.isActive ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.25)'}`,
                                    color: cat.isActive ? '#f87171' : '#10b981',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    cursor: togglingCatId === cat.id ? 'not-allowed' : 'pointer',
                                    opacity: togglingCatId === cat.id ? 0.6 : 1,
                                    transition: 'all 0.15s ease',
                                  }}
                                >
                                  <span>
                                    {togglingCatId === cat.id
                                      ? '...'
                                      : cat.isActive
                                      ? 'Deactivate'
                                      : 'Activate'}
                                  </span>
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
          </div>
        )}

        {/* 6. TAB CONTENT: SERVICES VIEW */}
        {activeTab === 'services' && (
          <div>
            {loadingServices ? (
              <div style={{ padding: '16px' }}>
                <TableSkeleton rows={5} columns={6} />
              </div>
            ) : (
              <div style={{ overflowX: 'auto', width: '100%' }}>
                <table style={{ width: '100%', tableLayout: 'auto', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
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
                      <th
                        style={{ padding: '10px 12px', width: '28%', cursor: 'pointer', userSelect: 'none' }}
                        onClick={handleSvcSort}
                      >
                        SERVICE NAME {svcSortOrder === 'asc' ? '▲' : svcSortOrder === 'desc' ? '▼' : '⇅'}
                      </th>
                      <th style={{ padding: '10px 12px', width: '28%' }}>DESCRIPTION</th>
                      <th style={{ padding: '10px 12px', width: '14%', whiteSpace: 'nowrap' }}>FIXED PRICE</th>
                      <th style={{ padding: '10px 12px', width: '12%', whiteSpace: 'nowrap' }}>EST. DURATION</th>
                      <th style={{ padding: '10px 12px', width: '10%', whiteSpace: 'nowrap' }}>STATUS</th>
                      <th style={{ padding: '10px 12px', width: '8%', textAlign: 'right', whiteSpace: 'nowrap' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredServices.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: '36px 12px', textAlign: 'center', color: '#64748b' }}>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: '#94a3b8', marginBottom: '2px' }}>
                            No services found in this category
                          </div>
                          <div style={{ fontSize: '12px' }}>
                            Select another category or click "+ Add Service" to create one.
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredServices.map((srv) => (
                        <tr
                          key={srv.id}
                          style={{
                            borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                            transition: 'background-color 0.12s ease',
                          }}
                          className="hover:bg-[rgba(255,255,255,0.02)]"
                        >
                          {/* Service Name */}
                          <td style={{ padding: '10px 12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                              <div
                                style={{
                                  width: '28px',
                                  height: '28px',
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
                                <Wrench size={13} />
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
                                title={srv.name}
                              >
                                {srv.name}
                              </span>
                            </div>
                          </td>

                          {/* Description */}
                          <td style={{ padding: '10px 12px', color: '#94a3b8', fontSize: '12px' }}>
                            <span
                              style={{
                                display: 'block',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                maxWidth: '240px',
                              }}
                              title={srv.description || ''}
                            >
                              {srv.description || '—'}
                            </span>
                          </td>

                          {/* Fixed Price */}
                          <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                            <span style={{ fontSize: '13px', fontWeight: 800, color: '#34d399', fontFamily: 'monospace' }}>
                              ₹{parseFloat(srv.fixedPrice).toFixed(2)}
                            </span>
                          </td>

                          {/* Est Duration */}
                          <td style={{ padding: '10px 12px', color: '#94a3b8', fontSize: '12px', whiteSpace: 'nowrap' }}>
                            {srv.estimatedDuration || '—'}
                          </td>

                          {/* Status */}
                          <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '3px 8px',
                                borderRadius: '9999px',
                                fontSize: '10px',
                                fontWeight: 800,
                                letterSpacing: '0.04em',
                                textTransform: 'uppercase',
                                backgroundColor: srv.isActive ? 'rgba(16, 185, 129, 0.14)' : 'rgba(239, 68, 68, 0.14)',
                                border: `1px solid ${srv.isActive ? 'rgba(52, 211, 153, 0.28)' : 'rgba(248, 113, 113, 0.28)'}`,
                                color: srv.isActive ? '#34d399' : '#f87171',
                              }}
                            >
                              {srv.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>

                          {/* Actions */}
                          <td style={{ padding: '10px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                              <button
                                onClick={() => openSvcDrawer(srv)}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                                  border: '1px solid rgba(255, 255, 255, 0.08)',
                                  color: '#e2e8f0',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease',
                                }}
                                className="hover:bg-[rgba(255,255,255,0.08)]"
                              >
                                <Edit2 size={12} />
                                <span>Edit</span>
                              </button>

                              <button
                                disabled={togglingSvcId === srv.id}
                                onClick={() => handleToggleSvcActive(srv)}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  backgroundColor: srv.isActive ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                  border: `1px solid ${srv.isActive ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.25)'}`,
                                  color: srv.isActive ? '#f87171' : '#10b981',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  cursor: togglingSvcId === srv.id ? 'not-allowed' : 'pointer',
                                  opacity: togglingSvcId === srv.id ? 0.6 : 1,
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                <span>
                                  {togglingSvcId === srv.id
                                    ? '...'
                                    : srv.isActive
                                    ? 'Deactivate'
                                    : 'Activate'}
                                </span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 7. CATEGORY DRAWER */}
      {isCatDrawerOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(9, 11, 17, 0.75)',
            backdropFilter: 'blur(6px)',
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
              backgroundColor: '#090d16',
              borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
              padding: '28px 24px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              overflowY: 'auto',
              boxShadow: '-10px 0 30px rgba(0, 0, 0, 0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                  {editingCategory ? 'Edit Category' : 'Create Category'}
                </h2>
                <button
                  onClick={() => setIsCatDrawerOpen(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              {catDrawerError && (
                <div style={{ marginBottom: '16px', backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', padding: '10px 14px', borderRadius: '8px', fontSize: '12px' }}>
                  {catDrawerError}
                </div>
              )}

              <form onSubmit={handleCatSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.04em' }}>
                    Category Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    placeholder="e.g. Home Cleaning"
                    value={catFormData.name}
                    onChange={(e) => setCatFormData({ ...catFormData, name: e.target.value })}
                    maxLength={60}
                    required
                    style={{
                      width: '100%',
                      backgroundColor: '#090d16',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '8px',
                      padding: '9px 12px',
                      color: '#f8fafc',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.04em' }}>
                    Description
                  </label>
                  <textarea
                    name="description"
                    placeholder="Brief details about services in this category"
                    value={catFormData.description}
                    onChange={(e) => setCatFormData({ ...catFormData, description: e.target.value })}
                    maxLength={255}
                    style={{
                      width: '100%',
                      height: '80px',
                      backgroundColor: '#090d16',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '8px',
                      padding: '9px 12px',
                      color: '#f8fafc',
                      fontSize: '13px',
                      outline: 'none',
                      resize: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.04em' }}>
                    Icon URL
                  </label>
                  <input
                    type="text"
                    name="iconUrl"
                    placeholder="e.g. /icons/cleaning.png"
                    value={catFormData.iconUrl}
                    onChange={(e) => setCatFormData({ ...catFormData, iconUrl: e.target.value })}
                    style={{
                      width: '100%',
                      backgroundColor: '#090d16',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '8px',
                      padding: '9px 12px',
                      color: '#f8fafc',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <small style={{ color: '#64748b', display: 'block', marginTop: '4px', fontSize: '11px' }}>
                    Validated format: PNG or SVG URLs.
                  </small>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.04em' }}>
                    Display Order
                  </label>
                  <input
                    type="number"
                    name="displayOrder"
                    value={catFormData.displayOrder}
                    onChange={(e) => setCatFormData({ ...catFormData, displayOrder: parseInt(e.target.value, 10) || 0 })}
                    style={{
                      width: '100%',
                      backgroundColor: '#090d16',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '8px',
                      padding: '9px 12px',
                      color: '#f8fafc',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingCat}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    backgroundColor: '#10b981',
                    color: '#020617',
                    fontWeight: 700,
                    fontSize: '13px',
                    border: 'none',
                    cursor: submittingCat ? 'not-allowed' : 'pointer',
                    marginTop: '8px',
                    opacity: submittingCat ? 0.7 : 1,
                  }}
                >
                  {submittingCat ? 'Saving Category...' : 'Save Category'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 8. SERVICE DRAWER */}
      {isSvcDrawerOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(9, 11, 17, 0.75)',
            backdropFilter: 'blur(6px)',
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
              backgroundColor: '#090d16',
              borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
              padding: '28px 24px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              overflowY: 'auto',
              boxShadow: '-10px 0 30px rgba(0, 0, 0, 0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                  {editingService ? 'Edit Service Item' : 'Create Service Item'}
                </h2>
                <button
                  onClick={() => setIsSvcDrawerOpen(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              {svcDrawerError && (
                <div style={{ marginBottom: '16px', backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', padding: '10px 14px', borderRadius: '8px', fontSize: '12px' }}>
                  {svcDrawerError}
                </div>
              )}

              <form onSubmit={handleSvcSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.04em' }}>
                    Category *
                  </label>
                  <select
                    name="categoryId"
                    value={svcFormData.categoryId}
                    onChange={(e) => setSvcFormData({ ...svcFormData, categoryId: e.target.value })}
                    required
                    disabled={!!editingService}
                    style={{
                      width: '100%',
                      backgroundColor: '#090d16',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '8px',
                      padding: '9px 12px',
                      color: '#f8fafc',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.04em' }}>
                    Service Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    placeholder="e.g. Standard Deep Cleaning"
                    value={svcFormData.name}
                    onChange={(e) => setSvcFormData({ ...svcFormData, name: e.target.value })}
                    maxLength={150}
                    required
                    style={{
                      width: '100%',
                      backgroundColor: '#090d16',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '8px',
                      padding: '9px 12px',
                      color: '#f8fafc',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.04em' }}>
                    Fixed Price (₹) *
                  </label>
                  <input
                    type="number"
                    step="1"
                    name="fixedPrice"
                    placeholder="e.g. 1499"
                    value={svcFormData.fixedPrice}
                    onChange={(e) => setSvcFormData({ ...svcFormData, fixedPrice: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      backgroundColor: '#090d16',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '8px',
                      padding: '9px 12px',
                      color: '#f8fafc',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.04em' }}>
                    Estimated Duration
                  </label>
                  <input
                    type="text"
                    name="estimatedDuration"
                    placeholder="e.g. 2-3 hours"
                    value={svcFormData.estimatedDuration}
                    onChange={(e) => setSvcFormData({ ...svcFormData, estimatedDuration: e.target.value })}
                    maxLength={50}
                    style={{
                      width: '100%',
                      backgroundColor: '#090d16',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '8px',
                      padding: '9px 12px',
                      color: '#f8fafc',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.04em' }}>
                    Description
                  </label>
                  <textarea
                    name="description"
                    placeholder="Details about what is included in this service"
                    value={svcFormData.description}
                    onChange={(e) => setSvcFormData({ ...svcFormData, description: e.target.value })}
                    style={{
                      width: '100%',
                      height: '80px',
                      backgroundColor: '#090d16',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '8px',
                      padding: '9px 12px',
                      color: '#f8fafc',
                      fontSize: '13px',
                      outline: 'none',
                      resize: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingSvc}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    backgroundColor: '#10b981',
                    color: '#020617',
                    fontWeight: 700,
                    fontSize: '13px',
                    border: 'none',
                    cursor: submittingSvc ? 'not-allowed' : 'pointer',
                    marginTop: '8px',
                    opacity: submittingSvc ? 0.7 : 1,
                  }}
                >
                  {submittingSvc ? 'Saving Service...' : 'Save Service Item'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 9. Confirmation Modals */}
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

function CatalogKpiSkeleton() {
  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full"
      aria-busy="true"
      aria-label="Loading catalog statistics"
    >
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          style={{
            backgroundColor: '#090d16',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '12px 14px',
            height: '120px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxSizing: 'border-box',
          }}
          className="animate-pulse"
        >
          <div style={{ width: '38px', height: '38px', borderRadius: '50%', backgroundColor: 'rgba(255, 255, 255, 0.08)', flexShrink: 0 }} />
          <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ width: '60px', height: '22px', backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: '4px' }} />
            <div style={{ width: '100px', height: '12px', backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: '4px' }} />
            <div style={{ width: '70px', height: '10px', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

