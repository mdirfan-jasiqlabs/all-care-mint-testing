import { create } from 'zustand';
import { getBaseUrl } from '../utils/api';
import * as storage from '../utils/storage';
import * as NetInfo from '@react-native-community/netinfo';
import { Platform } from 'react-native';

export interface Category {
  id: string;
  name: string;
  description: string | null;
  iconUrl: string | null;
  displayOrder: number;
  isActive: boolean;
}

export interface Service {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  fixedPrice: string;
  estimatedDuration: string | null;
  isActive: boolean;
}

interface CatalogState {
  categories: Category[];
  servicesByCategory: Record<string, Service[]>;
  serviceDetails: Record<string, Service>;
  isLoading: boolean;
  error: string | null;
  isOffline: boolean;
  isStale: boolean;
  fetchCategories: (token: string) => Promise<void>;
  fetchServicesByCategory: (categoryId: string, token: string) => Promise<void>;
  fetchServices: (categoryId: string, token: string) => Promise<void>; // alias to prevent regressions
  fetchServiceById: (serviceId: string, token: string) => Promise<Service | null>;
  setIsOffline: (offline: boolean) => void;
}

export const useCatalogStore = create<CatalogState>((set: any, get: any) => ({
  categories: [],
  servicesByCategory: {},
  serviceDetails: {},
  isLoading: false,
  error: null,
  isOffline: typeof window !== 'undefined' && typeof navigator !== 'undefined' ? !navigator.onLine : false,
  isStale: false,

  setIsOffline: (offline: boolean) => {
    const wasOffline = get().isOffline;
    set({ isOffline: offline });
    
    // Auto-revalidate on reconnect transition
    if (wasOffline && !offline) {
      const token = storage.getAccessToken() || '';
      if (token) {
        get().fetchCategories(token).catch(() => {});
      }
    }
  },

  fetchCategories: async (token: string) => {
    const { isOffline } = get();
    set({ isLoading: true, error: null });

    // 1. If offline, use cache
    if (isOffline) {
      const cachedData = storage.getItem('catalog.categories');
      const cachedTimestamp = storage.getItem('catalog.categories.timestamp');
      if (cachedData) {
        const categories = JSON.parse(cachedData);
        const age = Date.now() - parseInt(cachedTimestamp || '0', 10);
        const isStale = age > 5 * 60 * 1000; // 5 minutes
        set({ categories, isStale, isLoading: false });
        return;
      } else {
        set({ error: 'You are offline and no cached services exist.', isLoading: false });
        return;
      }
    }

    // 2. Online: Send If-None-Match if ETag exists
    try {
      const baseUrl = getBaseUrl();
      const etag = storage.getItem('catalog.categories.etag') || '';
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${token}`,
      };
      if (etag) {
        headers['If-None-Match'] = etag;
      }

      const res = await fetch(`${baseUrl}/api/v1/catalog/categories`, { headers });

      if (res.status === 304) {
        // Not modified: load from cache and update timestamp
        const cachedData = storage.getItem('catalog.categories');
        if (cachedData) {
          storage.setItem('catalog.categories.timestamp', Date.now().toString());
          set({ categories: JSON.parse(cachedData), isStale: false, isLoading: false });
          return;
        }
      }

      if (!res.ok) {
        throw new Error(`Failed to fetch categories: ${res.status}`);
      }

      const data = await res.json();
      if (data.success) {
        const categories = data.data;
        const newEtag = res.headers.get('etag');
        
        // Save to cache
        storage.setItem('catalog.categories', JSON.stringify(categories));
        storage.setItem('catalog.categories.timestamp', Date.now().toString());
        if (newEtag) {
          storage.setItem('catalog.categories.etag', newEtag);
        }
        set({ categories, isStale: false, isLoading: false });
      }
    } catch (err: any) {
      // Fallback to cache if network request fails
      const cachedData = storage.getItem('catalog.categories');
      if (cachedData) {
        set({ categories: JSON.parse(cachedData), isStale: true, isLoading: false });
      } else {
        set({ error: err.message || 'Error loading categories', isLoading: false });
      }
    }
  },

  fetchServicesByCategory: async (categoryId: string, token: string) => {
    const { isOffline } = get();
    set({ isLoading: true, error: null });

    if (isOffline) {
      const cachedData = storage.getItem(`catalog.services.${categoryId}`);
      const cachedTimestamp = storage.getItem(`catalog.services.${categoryId}.timestamp`);
      if (cachedData) {
        const services = JSON.parse(cachedData);
        const age = Date.now() - parseInt(cachedTimestamp || '0', 10);
        const isStale = age > 5 * 60 * 1000;
        set((state: any) => ({
          servicesByCategory: {
            ...state.servicesByCategory,
            [categoryId]: services,
          },
          isStale,
          isLoading: false,
        }));
        return;
      } else {
        set({ error: 'You are offline and no cached services exist for this category.', isLoading: false });
        return;
      }
    }

    try {
      const baseUrl = getBaseUrl();
      const etag = storage.getItem(`catalog.services.${categoryId}.etag`) || '';
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${token}`,
      };
      if (etag) {
        headers['If-None-Match'] = etag;
      }

      const res = await fetch(`${baseUrl}/api/v1/catalog/categories/${categoryId}/services`, { headers });

      if (res.status === 304) {
        const cachedData = storage.getItem(`catalog.services.${categoryId}`);
        if (cachedData) {
          storage.setItem(`catalog.services.${categoryId}.timestamp`, Date.now().toString());
          const services = JSON.parse(cachedData);
          set((state: any) => ({
            servicesByCategory: {
              ...state.servicesByCategory,
              [categoryId]: services,
            },
            isStale: false,
            isLoading: false,
          }));
          return;
        }
      }

      if (!res.ok) {
        throw new Error('Failed to fetch services');
      }

      const data = await res.json();
      if (data.success) {
        const services = data.data;
        const newEtag = res.headers.get('etag');

        storage.setItem(`catalog.services.${categoryId}`, JSON.stringify(services));
        storage.setItem(`catalog.services.${categoryId}.timestamp`, Date.now().toString());
        if (newEtag) {
          storage.setItem(`catalog.services.${categoryId}.etag`, newEtag);
        }

        set((state: any) => ({
          servicesByCategory: {
            ...state.servicesByCategory,
            [categoryId]: services,
          },
          isStale: false,
          isLoading: false,
        }));
      }
    } catch (err: any) {
      const cachedData = storage.getItem(`catalog.services.${categoryId}`);
      if (cachedData) {
        set((state: any) => ({
          servicesByCategory: {
            ...state.servicesByCategory,
            [categoryId]: JSON.parse(cachedData),
          },
          isStale: true,
          isLoading: false,
        }));
      } else {
        set({ error: err.message || 'Error loading services', isLoading: false });
      }
    }
  },

  fetchServices: async (categoryId: string, token: string): Promise<void> => {
    return get().fetchServicesByCategory(categoryId, token);
  },

  fetchServiceById: async (serviceId: string, token: string): Promise<Service | null> => {
    const { isOffline } = get();

    if (isOffline) {
      const cachedData = storage.getItem(`catalog.service.${serviceId}`);
      if (cachedData) {
        const service = JSON.parse(cachedData);
        set((state: any) => ({
          serviceDetails: {
            ...state.serviceDetails,
            [serviceId]: service,
          },
        }));
        return service;
      }
      const allCachedServices = Object.values(get().servicesByCategory).flat() as Service[];
      const matched = allCachedServices.find((s: Service) => s.id === serviceId);
      if (matched) {
        return matched;
      }
      return null;
    }

    try {
      const baseUrl = getBaseUrl();
      const res = await fetch(`${baseUrl}/api/v1/catalog/services/${serviceId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error('Failed to fetch service details');
      }

      const data = await res.json();
      if (data.success) {
        const service = data.data;
        storage.setItem(`catalog.service.${serviceId}`, JSON.stringify(service));
        storage.setItem(`catalog.service.${serviceId}.timestamp`, Date.now().toString());

        set((state: any) => ({
          serviceDetails: {
            ...state.serviceDetails,
            [serviceId]: service,
          },
        }));
        return service;
      }
      return null;
    } catch (err: any) {
      const cachedData = storage.getItem(`catalog.service.${serviceId}`);
      if (cachedData) {
        return JSON.parse(cachedData);
      }
      return null;
    }
  },
}));

// Setup single connectivity event listeners
if (Platform.OS === 'web') {
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('online', () => {
      useCatalogStore.getState().setIsOffline(false);
    });
    window.addEventListener('offline', () => {
      useCatalogStore.getState().setIsOffline(true);
    });
  }
} else {
  NetInfo.addEventListener((state) => {
    const isOffline = state.isConnected === false;
    useCatalogStore.getState().setIsOffline(isOffline);
  });
}
