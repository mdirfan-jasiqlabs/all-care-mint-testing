import { create } from 'zustand';
import apiClient from '../services/api';

export interface ProviderJob {
  id: string;
  bookingReference: string;
  status: string;
  serviceNameSnapshot?: string;
  servicePriceSnapshot?: string;
  slotDate?: string;
  slotLabelSnapshot?: string;
  addressSnapshot?: any;
  createdAt?: string;
}

interface ProviderJobState {
  assignedJobs: ProviderJob[];
  loading: boolean;
  error: string | null;
  fetchAssignedJobs: () => Promise<void>;
  clearJobs: () => void;
}

export const useProviderJobStore = create<ProviderJobState>((set: any) => ({
  assignedJobs: [],
  loading: false,
  error: null,
  fetchAssignedJobs: async () => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.get<{ success?: boolean; data: ProviderJob[] }>(
        '/api/v1/provider/bookings?status=ASSIGNED',
      );
      const jobs = Array.isArray(response.data) ? response.data : response.data || [];
      set({ assignedJobs: jobs, loading: false });
    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to fetch assigned jobs';
      set({ error: errorMsg, loading: false });
    }
  },
  clearJobs: () => {
    set({ assignedJobs: [], loading: false, error: null });
  },
}));

export default useProviderJobStore;
