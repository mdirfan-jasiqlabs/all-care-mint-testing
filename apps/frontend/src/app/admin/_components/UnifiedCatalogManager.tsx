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
      { bg: 'rgba(139, 92, 246, 0.18)', border: 'rgba(139, 92, 246, 0.3)', color: '#a78bfa', Icon: Sparkles },
      { bg: 'rgba(16, 185, 129, 0.18)', border: 'rgba(16, 185, 129, 0.3)', color: '#34d399', Icon: Folder },
      { bg: 'rgba(59, 130, 246, 0.18)', border: 'rgba(59, 130, 246, 0.3)', color: '#60a5fa', Icon: Droplet },
      { bg: 'rgba(245, 158, 11, 0.18)', border: 'rgba(245, 158, 11, 0.3)', color: '#fbbf24', Icon: Zap },
      { bg: 'rgba(236, 72, 153, 0.18)', border: 'rgba(236, 72, 153, 0.3)', color: '#f472b6', Icon: Paintbrush },
      { bg: 'rgba(20, 184, 166, 0.18)', border: 'rgba(20, 184, 166, 0.3)', color: '#2dd4bf', Icon: Wrench },
    ];

    const lower = name.toLowerCase();
    if (lower.includes('clean')) return { bg: 'rgba(16, 185, 129, 0.18)', border: 'rgba(16, 185, 129, 0.3)', color: '#34d399', Icon: Sparkles };
    if (lower.includes('ac') || lower.includes('repair')) return { bg: 'rgba(245, 158, 11, 0.18)', border: 'rgba(245, 158, 11, 0.3)', color: '#fbbf24', Icon: Zap };
    if (lower.includes('plumb')) return { bg: 'rgba(59, 130, 246, 0.18)', border: 'rgba(59, 130, 246, 0.3)', color: '#60a5fa', Icon: Droplet };
    if (lower.includes('paint')) return { bg: 'rgba(236, 72, 153, 0.18)', border: 'rgba(236, 72, 153, 0.3)', color: '#f472b6', Icon: Paintbrush };
    if (lower.includes('electric')) return { bg: 'rgba(139, 92, 246, 0.18)', border: 'rgba(139, 92, 246, 0.3)', color: '#a78bfa', Icon: Zap };

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

  const totalServices = useMemo(() => services.length, [services.length]);

  const filteredCategories = useMemo(
    () => getFilteredAndSortedCategories(),
    [categories, catSearchTerm, catStatusFilter, catCategoryFilter, catSortOrder]
  );

  const filteredServices = useMemo(
    () => getFilteredAndSortedServices(),
    [services, svcSearchTerm, svcStatusFilter, svcSortOrder]
  );

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* 1. Page Header & Primary Action CTA */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.5px' }}>
              Service Catalog Manager
            </h1>
            <div style={{ color: '#10b981', display: 'flex', alignItems: 'center' }}>
              <CheckCircle2 size={22} className="text-[#10b981]" />
            </div>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '14px', maxWidth: '640px', lineHeight: '1.5' }}>
            Manage your service categories. Create, edit and organize categories for easier service management.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {activeTab === 'categories' ? (
            <button
              id="btn-add-category"
              onClick={() => openCatDrawer()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '14px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 4px 14px rgba(79, 70, 229, 0.3)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <Plus size={18} />
              <span>Add Category</span>
            </button>
          ) : (
            <button
              id="btn-add-service"
              onClick={() => openSvcDrawer()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '14px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <Plus size={18} />
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
            padding: '10px 4px 14px 4px',
            fontSize: '15px',
            fontWeight: activeTab === 'categories' ? 700 : 500,
            color: activeTab === 'categories' ? '#10b981' : '#94a3b8',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'categories' ? '2px solid #10b981' : '2px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>Categories</span>
        </button>
        <button
          id="tab-services"
          onClick={() => handleTabChange('services')}
          style={{
            padding: '10px 4px 14px 4px',
            fontSize: '15px',
            fontWeight: activeTab === 'services' ? 700 : 500,
            color: activeTab === 'services' ? '#10b981' : '#94a3b8',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'services' ? '2px solid #10b981' : '2px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>Services</span>
        </button>
      </div>

      {/* Error Banner if API error occurs */}
      {error && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="alert-error" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', padding: '14px 18px', borderRadius: '10px' }}>
            {error}
          </div>
          <button
            className="btn-primary"
            style={{ width: '120px', height: '40px', fontSize: '14px' }}
            onClick={fetchCategories}
          >
            Retry
          </button>
        </div>
      )}

      {/* 3. Summary / KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: '16px',
        }}
      >
        {/* KPI 1: Total Categories */}
        <div
          style={{
            backgroundColor: '#0d1424',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '14px',
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#10b981',
              flexShrink: 0,
            }}
          >
            <Folder size={22} />
          </div>
          <div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#ffffff', lineHeight: 1.1 }}>
              {totalCategories}
            </div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0', marginTop: '4px' }}>
              Total Categories
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
              All categories in catalog
            </div>
          </div>
        </div>

        {/* KPI 2: Active Categories */}
        <div
          style={{
            backgroundColor: '#0d1424',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '14px',
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: 'rgba(59, 130, 246, 0.12)',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#3b82f6',
              flexShrink: 0,
            }}
          >
            <ShieldCheck size={22} />
          </div>
          <div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#ffffff', lineHeight: 1.1 }}>
              {activeCategories}
            </div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0', marginTop: '4px' }}>
              Active Categories
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
              Currently active
            </div>
          </div>
        </div>

        {/* KPI 3: Inactive Categories */}
        <div
          style={{
            backgroundColor: '#0d1424',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '14px',
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#f59e0b',
              flexShrink: 0,
            }}
          >
            <PauseCircle size={22} />
          </div>
          <div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#ffffff', lineHeight: 1.1 }}>
              {inactiveCategories}
            </div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0', marginTop: '4px' }}>
              Inactive Categories
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
              Not active
            </div>
          </div>
        </div>

        {/* KPI 4: Total Services */}
        <div
          style={{
            backgroundColor: '#0d1424',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '14px',
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: 'rgba(139, 92, 246, 0.12)',
              border: '1px solid rgba(139, 92, 246, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#a78bfa',
              flexShrink: 0,
            }}
          >
            <Package size={22} />
          </div>
          <div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#ffffff', lineHeight: 1.1 }}>
              {totalServices}
            </div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0', marginTop: '4px' }}>
              Total Services
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
              Across selected category
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
          gap: '12px',
          backgroundColor: '#0d1424',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          padding: '12px 16px',
        }}
      >
        {/* Search Input */}
        <div style={{ position: 'relative', flex: '1', minWidth: '220px', maxWidth: '400px' }}>
          <Search
            size={16}
            style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}
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
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '8px 32px 8px 36px',
              color: '#ffffff',
              fontSize: '13px',
              outline: 'none',
            }}
          />
          {(activeTab === 'categories' ? catSearchTerm : svcSearchTerm) && (
            <button
              onClick={() =>
                activeTab === 'categories' ? setCatSearchTerm('') : setSvcSearchTerm('')
              }
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Right Filter Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Category Dropdown Selector (Active on both tabs) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Category:</span>
            {activeTab === 'categories' ? (
              <select
                id="select-category-filter-cat-tab"
                value={catCategoryFilter}
                onChange={(e) => setCatCategoryFilter(e.target.value)}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  color: '#ffffff',
                  fontSize: '13px',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="ALL" style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
                  All Categories
                </option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id} style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
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
                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  color: '#ffffff',
                  fontSize: '13px',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id} style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={14} style={{ color: '#64748b' }} />
            <select
              value={activeTab === 'categories' ? catStatusFilter : svcStatusFilter}
              onChange={(e) => {
                const val = e.target.value as StatusFilter;
                if (activeTab === 'categories') setCatStatusFilter(val);
                else setSvcStatusFilter(val);
              }}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                padding: '8px 12px',
                color: '#ffffff',
                fontSize: '13px',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="ALL" style={{ backgroundColor: '#0f172a' }}>All Status</option>
              <option value="ACTIVE" style={{ backgroundColor: '#0f172a' }}>Active Only</option>
              <option value="INACTIVE" style={{ backgroundColor: '#0f172a' }}>Inactive Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* 5. TAB CONTENT: CATEGORIES VIEW */}
      {activeTab === 'categories' && (
        <div
          style={{
            backgroundColor: '#0d1424',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '14px',
            padding: '24px',
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.25)',
          }}
        >
          {loadingCategories ? (
            <TableSkeleton rows={5} columns={5} />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                      color: '#64748b',
                      fontSize: '12px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.6px',
                    }}
                  >
                    <th
                      style={{ padding: '14px 16px', cursor: 'pointer', userSelect: 'none' }}
                      onClick={handleCatSort}
                    >
                      Category Name {catSortOrder === 'asc' ? '▲' : catSortOrder === 'desc' ? '▼' : '⇅'}
                    </th>
                    <th style={{ padding: '14px 16px' }}>Description</th>
                    <th style={{ padding: '14px 16px', textAlign: 'center' }}>Services</th>
                    <th style={{ padding: '14px 16px' }}>Status</th>
                    <th style={{ padding: '14px 16px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCategories.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '48px 16px', textAlign: 'center', color: '#64748b' }}>
                        <div style={{ fontSize: '15px', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
                          No categories found
                        </div>
                        <div style={{ fontSize: '13px' }}>
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
                            transition: 'background-color 0.15s ease',
                          }}
                        >
                          {/* Category Name with Styled Icon Box */}
                          <td style={{ padding: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                              <div
                                style={{
                                  width: '40px',
                                  height: '40px',
                                  borderRadius: '10px',
                                  backgroundColor: iconStyle.bg,
                                  border: `1px solid ${iconStyle.border}`,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: iconStyle.color,
                                  flexShrink: 0,
                                }}
                              >
                                <IconComp size={20} />
                              </div>
                              <div>
                                <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '14px' }}>
                                  {cat.name}
                                </div>
                                {cat.iconUrl && (
                                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                    {cat.iconUrl}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Description */}
                          <td style={{ padding: '16px', color: '#94a3b8', fontSize: '13px', maxWidth: '320px' }}>
                            {cat.description || '—'}
                          </td>

                          {/* Services Count Pill */}
                          <td style={{ padding: '16px', textAlign: 'center' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '28px',
                                height: '24px',
                                borderRadius: '6px',
                                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: '#e2e8f0',
                                fontSize: '12px',
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
                          <td style={{ padding: '16px' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '4px 10px',
                                borderRadius: '12px',
                                fontSize: '12px',
                                fontWeight: 600,
                                backgroundColor: cat.isActive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                                border: `1px solid ${cat.isActive ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
                                color: cat.isActive ? '#10b981' : '#ef4444',
                              }}
                            >
                              <span
                                style={{
                                  width: '6px',
                                  height: '6px',
                                  borderRadius: '9999px',
                                  backgroundColor: cat.isActive ? '#10b981' : '#ef4444',
                                }}
                              />
                              {cat.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>

                          {/* Action Buttons */}
                          <td style={{ padding: '16px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                              <button
                                onClick={() => openCatDrawer(cat)}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  padding: '6px 12px',
                                  borderRadius: '8px',
                                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                  border: '1px solid rgba(255, 255, 255, 0.1)',
                                  color: '#e2e8f0',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                <Edit2 size={13} />
                                <span>Edit</span>
                              </button>

                              <button
                                disabled={togglingCatId === cat.id}
                                onClick={() => handleToggleCatActive(cat)}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  padding: '6px 12px',
                                  borderRadius: '8px',
                                  backgroundColor: cat.isActive ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                  border: `1px solid ${cat.isActive ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.25)'}`,
                                  color: cat.isActive ? '#ef4444' : '#10b981',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  cursor: togglingCatId === cat.id ? 'not-allowed' : 'pointer',
                                  opacity: togglingCatId === cat.id ? 0.6 : 1,
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                {togglingCatId === cat.id ? (
                                  <span className="spinner" style={{ width: '12px', height: '12px' }} />
                                ) : cat.isActive ? (
                                  <Square size={13} />
                                ) : (
                                  <Play size={13} />
                                )}
                                <span>
                                  {togglingCatId === cat.id
                                    ? 'Processing...'
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

          {/* Pagination Footer */}
          {!loadingCategories && filteredCategories.length > 0 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '20px',
                marginTop: '16px',
                borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                fontSize: '13px',
                color: '#64748b',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div>
                Showing 1 to {filteredCategories.length} of {categories.length} categories
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  disabled
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    color: '#475569',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'not-allowed',
                  }}
                >
                  <ChevronLeft size={16} />
                </button>
                <span
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    color: '#10b981',
                    fontWeight: 700,
                  }}
                >
                  1
                </span>
                <button
                  disabled
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    color: '#475569',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'not-allowed',
                  }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 6. TAB CONTENT: SERVICES VIEW */}
      {activeTab === 'services' && (
        <div
          style={{
            backgroundColor: '#0d1424',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '14px',
            padding: '24px',
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.25)',
          }}
        >
          {loadingServices ? (
            <TableSkeleton rows={5} columns={6} />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', minWidth: '680px', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                      color: '#64748b',
                      fontSize: '12px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.6px',
                    }}
                  >
                    <th
                      style={{ padding: '14px 16px', cursor: 'pointer', userSelect: 'none' }}
                      onClick={handleSvcSort}
                    >
                      Service Name {svcSortOrder === 'asc' ? '▲' : svcSortOrder === 'desc' ? '▼' : '⇅'}
                    </th>
                    <th style={{ padding: '14px 16px' }}>Description</th>
                    <th style={{ padding: '14px 16px' }}>Fixed Price (₹)</th>
                    <th style={{ padding: '14px 16px' }}>Est. Duration</th>
                    <th style={{ padding: '14px 16px' }}>Status</th>
                    <th style={{ padding: '14px 16px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredServices.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '48px 16px', textAlign: 'center', color: '#64748b' }}>
                        <div style={{ fontSize: '15px', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
                          No services found in this category
                        </div>
                        <div style={{ fontSize: '13px' }}>
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
                          transition: 'background-color 0.15s ease',
                        }}
                      >
                        {/* Service Name */}
                        <td style={{ padding: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div
                              style={{
                                width: '36px',
                                height: '36px',
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
                              <Wrench size={18} />
                            </div>
                            <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '14px' }}>
                              {srv.name}
                            </div>
                          </div>
                        </td>

                        {/* Description */}
                        <td style={{ padding: '16px', color: '#94a3b8', fontSize: '13px', maxWidth: '300px' }}>
                          {srv.description || '—'}
                        </td>

                        {/* Fixed Price */}
                        <td style={{ padding: '16px', fontWeight: 800, color: '#10b981', fontSize: '15px' }}>
                          ₹{parseFloat(srv.fixedPrice).toFixed(0)}
                        </td>

                        {/* Est Duration */}
                        <td style={{ padding: '16px', color: '#94a3b8', fontSize: '13px' }}>
                          {srv.estimatedDuration || '—'}
                        </td>

                        {/* Status */}
                        <td style={{ padding: '16px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '4px 10px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              fontWeight: 600,
                              backgroundColor: srv.isActive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                              border: `1px solid ${srv.isActive ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
                              color: srv.isActive ? '#10b981' : '#ef4444',
                            }}
                          >
                            <span
                              style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '9999px',
                                backgroundColor: srv.isActive ? '#10b981' : '#ef4444',
                              }}
                            />
                            {srv.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '16px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                            <button
                              onClick={() => openSvcDrawer(srv)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 12px',
                                borderRadius: '8px',
                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: '#e2e8f0',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <Edit2 size={13} />
                              <span>Edit</span>
                            </button>

                            <button
                              disabled={togglingSvcId === srv.id}
                              onClick={() => handleToggleSvcActive(srv)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 12px',
                                borderRadius: '8px',
                                backgroundColor: srv.isActive ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                border: `1px solid ${srv.isActive ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.25)'}`,
                                color: srv.isActive ? '#ef4444' : '#10b981',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: togglingSvcId === srv.id ? 'not-allowed' : 'pointer',
                                opacity: togglingSvcId === srv.id ? 0.6 : 1,
                                transition: 'all 0.15s ease',
                              }}
                            >
                              {togglingSvcId === srv.id ? (
                                <span className="spinner" style={{ width: '12px', height: '12px' }} />
                              ) : srv.isActive ? (
                                <Square size={13} />
                              ) : (
                                <Play size={13} />
                              )}
                              <span>
                                {togglingSvcId === srv.id
                                  ? 'Processing...'
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

          {/* Pagination Footer */}
          {!loadingServices && filteredServices.length > 0 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '20px',
                marginTop: '16px',
                borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                fontSize: '13px',
                color: '#64748b',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div>
                Showing 1 to {filteredServices.length} of {services.length} services
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  disabled
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    color: '#475569',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'not-allowed',
                  }}
                >
                  <ChevronLeft size={16} />
                </button>
                <span
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    color: '#10b981',
                    fontWeight: 700,
                  }}
                >
                  1
                </span>
                <button
                  disabled
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    color: '#475569',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'not-allowed',
                  }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

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
              maxWidth: '460px',
              height: '100%',
              backgroundColor: '#0f172a',
              borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
              padding: '32px 28px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              overflowY: 'auto',
              boxShadow: '-10px 0 30px rgba(0, 0, 0, 0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff' }}>
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
                  <X size={20} />
                </button>
              </div>

              {catDrawerError && (
                <div className="alert-error" style={{ marginBottom: '20px', backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', padding: '12px 16px', borderRadius: '8px', fontSize: '13px' }}>
                  {catDrawerError}
                </div>
              )}

              <form onSubmit={handleCatSubmit}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#e2e8f0', marginBottom: '6px' }}>
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
                      backgroundColor: '#1e293b',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      color: '#ffffff',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#e2e8f0', marginBottom: '6px' }}>
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
                      height: '84px',
                      backgroundColor: '#1e293b',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      color: '#ffffff',
                      fontSize: '14px',
                      outline: 'none',
                      resize: 'none',
                    }}
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#e2e8f0', marginBottom: '6px' }}>
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
                      backgroundColor: '#1e293b',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      color: '#ffffff',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  />
                  <small style={{ color: '#64748b', display: 'block', marginTop: '4px', fontSize: '11px' }}>
                    Validated format: PNG or SVG URLs.
                  </small>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#e2e8f0', marginBottom: '6px' }}>
                    Display Order
                  </label>
                  <input
                    type="number"
                    name="displayOrder"
                    value={catFormData.displayOrder}
                    onChange={(e) => setCatFormData({ ...catFormData, displayOrder: parseInt(e.target.value, 10) || 0 })}
                    style={{
                      width: '100%',
                      backgroundColor: '#1e293b',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      color: '#ffffff',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingCat}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '14px',
                    border: 'none',
                    cursor: submittingCat ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: submittingCat ? 0.7 : 1,
                  }}
                >
                  {submittingCat ? <div className="spinner" style={{ width: '16px', height: '16px' }} /> : 'Save Category'}
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
              maxWidth: '460px',
              height: '100%',
              backgroundColor: '#0f172a',
              borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
              padding: '32px 28px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              overflowY: 'auto',
              boxShadow: '-10px 0 30px rgba(0, 0, 0, 0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff' }}>
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
                  <X size={20} />
                </button>
              </div>

              {svcDrawerError && (
                <div className="alert-error" style={{ marginBottom: '20px', backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', padding: '12px 16px', borderRadius: '8px', fontSize: '13px' }}>
                  {svcDrawerError}
                </div>
              )}

              <form onSubmit={handleSvcSubmit}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#e2e8f0', marginBottom: '6px' }}>
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
                      backgroundColor: '#1e293b',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      color: '#ffffff',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#e2e8f0', marginBottom: '6px' }}>
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
                      backgroundColor: '#1e293b',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      color: '#ffffff',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#e2e8f0', marginBottom: '6px' }}>
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
                      backgroundColor: '#1e293b',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      color: '#ffffff',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#e2e8f0', marginBottom: '6px' }}>
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
                      backgroundColor: '#1e293b',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      color: '#ffffff',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  />
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#e2e8f0', marginBottom: '6px' }}>
                    Description
                  </label>
                  <textarea
                    name="description"
                    placeholder="Details about what is included in this service"
                    value={svcFormData.description}
                    onChange={(e) => setSvcFormData({ ...svcFormData, description: e.target.value })}
                    style={{
                      width: '100%',
                      height: '84px',
                      backgroundColor: '#1e293b',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      color: '#ffffff',
                      fontSize: '14px',
                      outline: 'none',
                      resize: 'none',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingSvc}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '14px',
                    border: 'none',
                    cursor: submittingSvc ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: submittingSvc ? 0.7 : 1,
                  }}
                >
                  {submittingSvc ? <div className="spinner" style={{ width: '16px', height: '16px' }} /> : 'Save Service Item'}
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
