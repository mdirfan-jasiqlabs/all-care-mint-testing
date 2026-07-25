import { create } from 'zustand';
import { getBaseUrl } from '../utils/api';

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
  isLoading: boolean;
  error: string | null;
  fetchCategories: (token: string) => Promise<void>;
  fetchServices: (categoryId: string, token: string) => Promise<void>;
}

export const useCatalogStore = create<CatalogState>((set: any) => ({
  categories: [],
  servicesByCategory: {},
  isLoading: false,
  error: null,

  fetchCategories: async (token: string) => {
    set({ isLoading: true, error: null });
    try {
      const baseUrl = getBaseUrl();
      const res = await fetch(`${baseUrl}/api/v1/catalog/categories`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error('Failed to fetch categories');
      }

      const data = await res.json();
      if (data.success) {
        set({ categories: data.data, isLoading: false });
      }
    } catch (err: any) {
      set({ error: err.message || 'Error loading categories', isLoading: false });
    }
  },

  fetchServices: async (categoryId: string, token: string) => {
    set({ isLoading: true, error: null });
    try {
      const baseUrl = getBaseUrl();
      const res = await fetch(`${baseUrl}/api/v1/catalog/categories/${categoryId}/services`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error('Failed to fetch services');
      }

      const data = await res.json();
      if (data.success) {
        set((state: any) => ({
          servicesByCategory: {
            ...state.servicesByCategory,
            [categoryId]: data.data,
          },
          isLoading: false,
        }));
      }
    } catch (err: any) {
      set({ error: err.message || 'Error loading services', isLoading: false });
    }
  },
}));
