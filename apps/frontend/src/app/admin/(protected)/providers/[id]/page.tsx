'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { useToast } from '../../../_components/Toast';
import ConfirmModal from '../../../_components/ConfirmModal';
import {
  ArrowLeft,
  User,
  Phone,
  MapPin,
  Briefcase,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Plus,
  Trash2,
  Calendar,
  Layers,
  Star,
  Info,
  ShieldAlert,
  Loader2,
  UserCheck,
  UserX,
  Ban,
} from 'lucide-react';

interface Provider {
  id: string;
  displayName: string;
  mobileNumber: string;
  serviceArea: string;
  status: string;
  createdAt?: string | Date;
  categories: { id: string; name: string }[];
}

interface Category {
  id: string;
  name: string;
  description: string;
}

function getAvatarInitials(name: string): string {
  if (!name) return 'P';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_COLORS = [
  { bg: 'var(--admin-badge-active-bg)', text: 'var(--admin-badge-active-text)', border: 'var(--admin-badge-active-border)' },
  { bg: 'var(--admin-badge-pending-bg)', text: 'var(--admin-badge-pending-text)', border: 'var(--admin-badge-pending-border)' },
  { bg: 'var(--admin-badge-assigned-bg)', text: 'var(--admin-badge-assigned-text)', border: 'var(--admin-badge-assigned-border)' },
  { bg: 'var(--admin-badge-inactive-bg)', text: 'var(--admin-badge-inactive-text)', border: 'var(--admin-badge-inactive-border)' },
  { bg: 'rgba(168, 85, 247, 0.15)', text: 'var(--admin-kpi-purple-text)', border: 'rgba(168, 85, 247, 0.3)' },
  { bg: 'var(--admin-badge-assigned-bg)', text: 'var(--admin-kpi-blue-text)', border: 'var(--admin-badge-assigned-border)' },
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
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

  // Modal confirm state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    targetStatus: string;
    title: string;
    message: string;
    confirmText: string;
  }>({
    isOpen: false,
    targetStatus: '',
    title: '',
    message: '',
    confirmText: 'Confirm',
  });

  const fetchData = async () => {
    try {
      setLoading(true);

      // 1. Fetch provider details
      const providerData = await apiClient.get(`/api/v1/admin/providers/${id}`);
      if (providerData.success) {
        setProvider(providerData.data);
      }

      // 2. Fetch all service categories
      try {
        const pubData = await apiClient.get('/api/v1/public/categories');
        if (pubData.success && Array.isArray(pubData.data)) {
          setCategories(pubData.data);
        } else {
          const admData = await apiClient.get('/api/v1/admin/catalog/categories');
          if (admData.success && Array.isArray(admData.data)) {
            setCategories(admData.data);
          }
        }
      } catch {
        // Fallback fetch
      }
    } catch (err: any) {
      if (err.status === 401 || err.status === 403) {
        router.push('/admin/login');
        return;
      }
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
      await apiClient.patch(`/api/v1/admin/providers/${id}/status`, { status: newStatus });
      addToast(`Provider status updated to ${newStatus.replace('_', ' ')}.`, 'success');
      setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      await fetchData();
    } catch (err: any) {
      addToast(err.message || 'Status transition failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const triggerStatusConfirm = (targetStatus: string) => {
    let title = 'Update Status';
    let message = `Are you sure you want to change status to ${targetStatus.replace('_', ' ')}?`;
    let confirmText = 'Confirm';

    if (targetStatus === 'SUSPENDED') {
      title = 'Suspend Provider Account';
      message = 'This will suspend the provider and restrict them from receiving any new booking allocations.';
      confirmText = 'Suspend Account';
    } else if (targetStatus === 'APPROVED') {
      title = 'Approve Provider Account';
      message = 'This will activate the provider account and enable manual & auto job allocations.';
      confirmText = 'Approve Account';
    } else if (targetStatus === 'REJECTED') {
      title = 'Reject Provider Application';
      message = 'This will reject the provider application and decline access to the platform.';
      confirmText = 'Reject Application';
    }

    setConfirmModal({
      isOpen: true,
      targetStatus,
      title,
      message,
      confirmText,
    });
  };

  const handleAddCategory = async (categoryId: string) => {
    try {
      setSubmitting(true);
      setPendingCategoryId(categoryId);
      await apiClient.post(`/api/v1/admin/providers/${id}/categories`, { categoryId });
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
      await apiClient.delete(`/api/v1/admin/providers/${id}/categories/${categoryId}`);
      addToast('Category mapping removed.', 'success');
      await fetchData();
    } catch (err: any) {
      addToast(err.message || 'Mapping removal failed', 'error');
    } finally {
      setSubmitting(false);
      setPendingCategoryId(null);
    }
  };

  // Skeleton Loader
  if (loading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto animate-pulse">
        {/* Back Button Skeleton */}
        <div className="h-4 w-48 rounded-md" style={{ backgroundColor: 'var(--admin-skeleton-bg)' }} />

        {/* Hero Card Skeleton */}
        <div className="rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6" style={{ backgroundColor: 'var(--admin-card-bg)', border: '1px solid var(--admin-border)' }}>
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl" style={{ backgroundColor: 'var(--admin-skeleton-bg)' }} />
            <div className="space-y-2">
              <div className="h-7 w-40 rounded-lg" style={{ backgroundColor: 'var(--admin-skeleton-bg)' }} />
              <div className="h-4 w-64 rounded-md" style={{ backgroundColor: 'var(--admin-skeleton-bg)' }} />
            </div>
          </div>
          <div className="h-8 w-28 rounded-full" style={{ backgroundColor: 'var(--admin-skeleton-bg)' }} />
        </div>

        {/* Main 2-Column Layout Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column Skeleton */}
          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-2xl p-6 space-y-6" style={{ backgroundColor: 'var(--admin-card-bg)', border: '1px solid var(--admin-border)' }}>
              <div className="h-5 w-32 rounded-md" style={{ backgroundColor: 'var(--admin-skeleton-bg)' }} />
              <div className="space-y-4">
                <div className="h-10 rounded-xl" style={{ backgroundColor: 'var(--admin-skeleton-bg)' }} />
                <div className="h-10 rounded-xl" style={{ backgroundColor: 'var(--admin-skeleton-bg)' }} />
              </div>
              <div className="pt-4 border-t space-y-4" style={{ borderColor: 'var(--admin-border)' }}>
                <div className="h-4 w-36 rounded-md" style={{ backgroundColor: 'var(--admin-skeleton-bg)' }} />
                <div className="h-24 rounded-xl" style={{ backgroundColor: 'var(--admin-skeleton-bg)' }} />
              </div>
            </div>
          </div>

          {/* Right Column Skeleton */}
          <div className="lg:col-span-7 space-y-6">
            <div className="rounded-2xl p-6 space-y-6" style={{ backgroundColor: 'var(--admin-card-bg)', border: '1px solid var(--admin-border)' }}>
              <div className="h-5 w-44 rounded-md" style={{ backgroundColor: 'var(--admin-skeleton-bg)' }} />
              <div className="h-4 w-full rounded-md" style={{ backgroundColor: 'var(--admin-skeleton-bg)' }} />
              <div className="space-y-3">
                <div className="h-16 rounded-xl" style={{ backgroundColor: 'var(--admin-skeleton-bg)' }} />
                <div className="h-16 rounded-xl" style={{ backgroundColor: 'var(--admin-skeleton-bg)' }} />
                <div className="h-16 rounded-xl" style={{ backgroundColor: 'var(--admin-skeleton-bg)' }} />
              </div>
            </div>
          </div>
        </div>

      </div>
    );
  }

  if (!provider) {
    return (
      <div className="max-w-xl mx-auto my-16 rounded-2xl p-8 text-center space-y-4 shadow-xl" style={{ backgroundColor: 'var(--admin-card-bg)', border: '1px solid var(--admin-badge-inactive-border)' }}>
        <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto" style={{ backgroundColor: 'var(--admin-badge-inactive-bg)', border: '1px solid var(--admin-badge-inactive-border)', color: 'var(--admin-badge-inactive-text)' }}>
          <XCircle className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold" style={{ color: 'var(--admin-text-primary)' }}>Provider Not Found</h2>
        <p className="text-sm" style={{ color: 'var(--admin-text-secondary)' }}>
          The provider details you requested could not be located or may have been removed.
        </p>
        <button
          onClick={() => router.push('/admin/providers')}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-colors cursor-pointer"
          style={{ backgroundColor: 'var(--admin-surface-hover)', border: '1px solid var(--admin-border)', color: 'var(--admin-text-primary)' }}
        >
          <ArrowLeft className="w-4 h-4" /> Back to Providers Directory
        </button>
      </div>
    );
  }

  const avatarStyle = getAvatarColor(provider.displayName || '');
  const initials = getAvatarInitials(provider.displayName || '');

  // Joined On date formatting
  const formattedJoinedDate = provider.createdAt
    ? new Date(provider.createdAt).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '—';

  return (
    <div className="space-y-6 max-w-7xl mx-auto" style={{ color: 'var(--admin-text-primary)' }}>
      {/* 1. BACK NAVIGATION */}
      <div>
        <button
          onClick={() => router.push('/admin/providers')}
          className="inline-flex items-center gap-2 text-xs font-semibold px-3.5 py-1.5 rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 cursor-pointer"
          style={{
            backgroundColor: 'var(--admin-badge-active-bg)',
            border: '1px solid var(--admin-badge-active-border)',
            color: 'var(--admin-badge-active-text)',
          }}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Providers Directory</span>
        </button>
      </div>

      {/* 2. PROVIDER IDENTITY HERO CARD */}
      <div className="rounded-2xl p-6 shadow-lg relative overflow-hidden backdrop-blur-sm" style={{ backgroundColor: 'var(--admin-card-bg)', border: '1px solid var(--admin-border)' }}>
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-5">
            {/* Deterministic Avatar */}
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-xl shrink-0 shadow-inner"
              style={{
                backgroundColor: avatarStyle.bg,
                color: avatarStyle.text,
                border: `1px solid ${avatarStyle.border}`,
              }}
            >
              {initials}
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: 'var(--admin-text-primary)' }}>
                {provider.displayName}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-medium" style={{ color: 'var(--admin-text-muted)' }}>ID:</span>
                <code className="text-xs font-mono px-2 py-0.5 rounded" style={{ color: 'var(--admin-text-secondary)', backgroundColor: 'var(--admin-surface-hover)', border: '1px solid var(--admin-border)' }}>
                  {provider.id}
                </code>
              </div>
            </div>
          </div>

          {/* Status Badge */}
          <div className="shrink-0">
            {provider.status === 'APPROVED' && (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider" style={{ backgroundColor: 'var(--admin-badge-active-bg)', color: 'var(--admin-badge-active-text)', border: '1px solid var(--admin-badge-active-border)' }}>
                <ShieldCheck className="w-4 h-4" />
                <span>Approved</span>
              </span>
            )}
            {provider.status === 'PENDING_REVIEW' && (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider" style={{ backgroundColor: 'var(--admin-badge-pending-bg)', color: 'var(--admin-badge-pending-text)', border: '1px solid var(--admin-badge-pending-border)' }}>
                <Clock className="w-4 h-4" />
                <span>Pending Review</span>
              </span>
            )}
            {provider.status === 'SUSPENDED' && (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider" style={{ backgroundColor: 'var(--admin-badge-inactive-bg)', color: 'var(--admin-badge-inactive-text)', border: '1px solid var(--admin-badge-inactive-border)' }}>
                <AlertTriangle className="w-4 h-4" />
                <span>Suspended</span>
              </span>
            )}
            {provider.status === 'REJECTED' && (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider" style={{ backgroundColor: 'var(--admin-surface-hover)', color: 'var(--admin-text-muted)', border: '1px solid var(--admin-border)' }}>
                <XCircle className="w-4 h-4" />
                <span>Rejected</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 3. MAIN TWO-COLUMN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Profile Details & Status Operations */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-2xl p-6 space-y-6 shadow-md" style={{ backgroundColor: 'var(--admin-card-bg)', border: '1px solid var(--admin-border)' }}>
            {/* Section Header */}
            <div className="flex items-center gap-2.5 pb-4 border-b" style={{ borderColor: 'var(--admin-border)' }}>
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <User className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold tracking-tight" style={{ color: 'var(--admin-text-primary)' }}>Profile Details</h2>
            </div>

            {/* Fields List */}
            <div className="space-y-4">
              {/* Mobile Number */}
              <div className="flex items-start gap-3.5 p-3.5 rounded-xl border transition-colors" style={{ backgroundColor: 'var(--admin-surface-hover)', borderColor: 'var(--admin-border)' }}>
                <div className="p-2 rounded-lg text-slate-400 mt-0.5" style={{ backgroundColor: 'var(--admin-card-bg)' }}>
                  <Phone className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-muted)' }}>
                    Mobile Number
                  </div>
                  <div className="text-sm font-semibold mt-0.5 tracking-wide" style={{ color: 'var(--admin-text-primary)' }}>
                    {provider.mobileNumber}
                  </div>
                </div>
              </div>

              {/* Service Area */}
              <div className="flex items-start gap-3.5 p-3.5 rounded-xl border transition-colors" style={{ backgroundColor: 'var(--admin-surface-hover)', borderColor: 'var(--admin-border)' }}>
                <div className="p-2 rounded-lg text-slate-400 mt-0.5" style={{ backgroundColor: 'var(--admin-card-bg)' }}>
                  <MapPin className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-muted)' }}>
                    Primary Service Area
                  </div>
                  <div className="text-sm font-semibold mt-0.5" style={{ color: 'var(--admin-text-primary)' }}>
                    {provider.serviceArea}
                  </div>
                </div>
              </div>
            </div>

            {/* STATUS OPERATIONS SUB-SECTION */}
            <div className="pt-5 border-t space-y-4" style={{ borderColor: 'var(--admin-border)' }}>
              <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-muted)' }}>
                Status Operations
              </h3>

              {/* PENDING_REVIEW Actions */}
              {provider.status === 'PENDING_REVIEW' && (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    disabled={submitting}
                    onClick={() => triggerStatusConfirm('APPROVED')}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs transition-all shadow-md shadow-emerald-500/10 disabled:opacity-50 cursor-pointer"
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>Approve</span>
                  </button>

                  <button
                    disabled={submitting}
                    onClick={() => triggerStatusConfirm('REJECTED')}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-bold text-xs transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <UserX className="w-4 h-4" />
                    <span>Reject</span>
                  </button>
                </div>
              )}

              {/* APPROVED Actions (Suspend Danger Zone Card) */}
              {provider.status === 'APPROVED' && (
                <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: 'var(--admin-badge-inactive-bg)', border: '1px solid var(--admin-badge-inactive-border)' }}>
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg shrink-0" style={{ backgroundColor: 'var(--admin-card-bg)', color: 'var(--admin-badge-inactive-text)' }}>
                      <ShieldAlert className="w-4 h-4" />
                    </div>
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold" style={{ color: 'var(--admin-badge-inactive-text)' }}>Suspend Account</div>
                      <div className="text-xs leading-snug" style={{ color: 'var(--admin-text-secondary)' }}>
                        This will suspend the provider and restrict new bookings.
                      </div>
                    </div>
                  </div>
                  <button
                    disabled={submitting}
                    onClick={() => triggerStatusConfirm('SUSPENDED')}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition-all disabled:opacity-50 cursor-pointer"
                    style={{ backgroundColor: 'var(--admin-badge-inactive-bg)', border: '1px solid var(--admin-badge-inactive-border)', color: 'var(--admin-badge-inactive-text)' }}
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>Suspend Account</span>
                  </button>
                </div>
              )}

              {/* SUSPENDED Actions */}
              {provider.status === 'SUSPENDED' && (
                <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: 'var(--admin-badge-active-bg)', border: '1px solid var(--admin-badge-active-border)' }}>
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg shrink-0" style={{ backgroundColor: 'var(--admin-card-bg)', color: 'var(--admin-badge-active-text)' }}>
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold" style={{ color: 'var(--admin-badge-active-text)' }}>Re-Approve Account</div>
                      <div className="text-xs leading-snug" style={{ color: 'var(--admin-text-secondary)' }}>
                        Restore provider access and re-enable automated & manual job allocations.
                      </div>
                    </div>
                  </div>
                  <button
                    disabled={submitting}
                    onClick={() => triggerStatusConfirm('APPROVED')}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-bold text-xs transition-all disabled:opacity-50 cursor-pointer"
                    style={{ backgroundColor: 'var(--admin-accent)', color: '#ffffff' }}
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>Re-Approve Account</span>
                  </button>
                </div>
              )}

              {/* REJECTED Actions */}
              {provider.status === 'REJECTED' && (
                <div className="border rounded-xl p-4 space-y-3" style={{ backgroundColor: 'var(--admin-surface-hover)', borderColor: 'var(--admin-border)' }}>
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg shrink-0" style={{ backgroundColor: 'var(--admin-card-bg)' }}>
                      <UserCheck className="w-4 h-4" style={{ color: 'var(--admin-accent)' }} />
                    </div>
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold" style={{ color: 'var(--admin-text-primary)' }}>Approve Account</div>
                      <div className="text-xs leading-snug" style={{ color: 'var(--admin-text-secondary)' }}>
                        Reconsider and approve this previously rejected provider application.
                      </div>
                    </div>
                  </div>
                  <button
                    disabled={submitting}
                    onClick={() => triggerStatusConfirm('APPROVED')}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-bold text-xs transition-all disabled:opacity-50 cursor-pointer"
                    style={{ backgroundColor: 'var(--admin-accent)', color: '#ffffff' }}
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>Approve Account</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Service Capabilities */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-2xl p-6 space-y-6 shadow-md" style={{ backgroundColor: 'var(--admin-card-bg)', border: '1px solid var(--admin-border)' }}>
            {/* Section Header */}
            <div className="space-y-1.5 pb-4 border-b" style={{ borderColor: 'var(--admin-border)' }}>
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl" style={{ backgroundColor: 'var(--admin-badge-active-bg)', border: '1px solid var(--admin-badge-active-border)', color: 'var(--admin-badge-active-text)' }}>
                  <Briefcase className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-bold tracking-tight" style={{ color: 'var(--admin-text-primary)' }}>
                  Service Capabilities
                </h2>
              </div>
              <p className="text-xs leading-relaxed pl-10" style={{ color: 'var(--admin-text-secondary)' }}>
                Map the service category catalog mappings for this provider to receive manual and auto job allocations.
              </p>
            </div>

            {/* Capability Rows List */}
            <div className="space-y-3">
              {categories.length === 0 ? (
                <div className="text-center py-8 text-xs italic border border-dashed rounded-xl" style={{ color: 'var(--admin-text-muted)', borderColor: 'var(--admin-border)' }}>
                  No service categories found in catalog.
                </div>
              ) : (
                categories.map((cat) => {
                  const isMapped = provider.categories.some((c) => c.id === cat.id);
                  const isCurrentPending = pendingCategoryId === cat.id;

                  return (
                    <div
                      key={cat.id}
                      style={{
                        backgroundColor: isMapped ? 'var(--admin-badge-active-bg)' : 'var(--admin-surface-hover)',
                        borderColor: isMapped ? 'var(--admin-badge-active-border)' : 'var(--admin-border)',
                      }}
                      className="flex items-center justify-between gap-4 p-4 rounded-xl transition-all border"
                    >
                      <div className="space-y-1 min-w-0 pr-2">
                        <div className="text-sm font-bold truncate flex items-center gap-2" style={{ color: 'var(--admin-text-primary)' }}>
                          <span>{cat.name}</span>
                          {isMapped && (
                            <span className="w-1.5 h-1.5 rounded-full inline-block shrink-0" style={{ backgroundColor: 'var(--admin-badge-active-text)' }} />
                          )}
                        </div>
                        <div className="text-xs line-clamp-2" style={{ color: 'var(--admin-text-muted)' }}>
                          {cat.description || 'No category description available.'}
                        </div>
                      </div>

                      {/* Add / Remove Action */}
                      <div className="shrink-0">
                        {isMapped ? (
                          <button
                            disabled={submitting}
                            onClick={() => handleRemoveCategory(cat.id)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer"
                            style={{
                              backgroundColor: 'var(--admin-badge-inactive-bg)',
                              border: '1px solid var(--admin-badge-inactive-border)',
                              color: 'var(--admin-badge-inactive-text)',
                            }}
                          >
                            {isCurrentPending ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Removing...</span>
                              </>
                            ) : (
                              <>
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Remove</span>
                              </>
                            )}
                          </button>
                        ) : (
                          <button
                            disabled={submitting}
                            onClick={() => handleAddCategory(cat.id)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer"
                            style={{
                              backgroundColor: 'var(--admin-badge-active-bg)',
                              border: '1px solid var(--admin-badge-active-border)',
                              color: 'var(--admin-badge-active-text)',
                            }}
                          >
                            {isCurrentPending ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Adding...</span>
                              </>
                            ) : (
                              <>
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CONFIRMATION MODAL */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        cancelText="Cancel"
        isLoading={submitting}
        onConfirm={() => handleStatusChange(confirmModal.targetStatus)}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
