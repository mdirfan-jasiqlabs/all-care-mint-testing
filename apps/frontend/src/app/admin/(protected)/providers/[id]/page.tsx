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
  { bg: 'rgba(16, 185, 129, 0.15)', text: '#10b981', border: 'rgba(16, 185, 129, 0.3)' },
  { bg: 'rgba(245, 158, 11, 0.15)', text: '#f59e0b', border: 'rgba(245, 158, 11, 0.3)' },
  { bg: 'rgba(20, 184, 166, 0.15)', text: '#14b8a6', border: 'rgba(20, 184, 166, 0.3)' },
  { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444', border: 'rgba(239, 68, 68, 0.3)' },
  { bg: 'rgba(168, 85, 247, 0.15)', text: '#a855f7', border: 'rgba(168, 85, 247, 0.3)' },
  { bg: 'rgba(59, 130, 246, 0.15)', text: '#3b82f6', border: 'rgba(59, 130, 246, 0.3)' },
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
        <div className="h-4 w-48 bg-slate-800/80 rounded-md" />

        {/* Hero Card Skeleton */}
        <div className="bg-[#0f172a]/70 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-slate-800/80" />
            <div className="space-y-2">
              <div className="h-7 w-40 bg-slate-800/80 rounded-lg" />
              <div className="h-4 w-64 bg-slate-800/60 rounded-md" />
            </div>
          </div>
          <div className="h-8 w-28 bg-slate-800/80 rounded-full" />
        </div>

        {/* Main 2-Column Layout Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column Skeleton */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-[#0f172a]/70 border border-slate-800 rounded-2xl p-6 space-y-6">
              <div className="h-5 w-32 bg-slate-800/80 rounded-md" />
              <div className="space-y-4">
                <div className="h-10 bg-slate-800/40 rounded-xl" />
                <div className="h-10 bg-slate-800/40 rounded-xl" />
              </div>
              <div className="pt-4 border-t border-slate-800/80 space-y-4">
                <div className="h-4 w-36 bg-slate-800/80 rounded-md" />
                <div className="h-24 bg-slate-800/40 rounded-xl" />
              </div>
            </div>
          </div>

          {/* Right Column Skeleton */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-[#0f172a]/70 border border-slate-800 rounded-2xl p-6 space-y-6">
              <div className="h-5 w-44 bg-slate-800/80 rounded-md" />
              <div className="h-4 w-full bg-slate-800/50 rounded-md" />
              <div className="space-y-3">
                <div className="h-16 bg-slate-800/40 rounded-xl" />
                <div className="h-16 bg-slate-800/40 rounded-xl" />
                <div className="h-16 bg-slate-800/40 rounded-xl" />
              </div>
            </div>
          </div>
        </div>

      </div>
    );
  }

  if (!provider) {
    return (
      <div className="max-w-xl mx-auto my-16 bg-[#0f172a] border border-red-500/20 rounded-2xl p-8 text-center space-y-4 shadow-xl">
        <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-red-400">
          <XCircle className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-white">Provider Not Found</h2>
        <p className="text-sm text-slate-400">
          The provider details you requested could not be located or may have been removed.
        </p>
        <button
          onClick={() => router.push('/admin/providers')}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium transition-colors border border-slate-700"
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
          className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-400/90 hover:text-emerald-300 bg-emerald-950/40 hover:bg-emerald-900/40 border border-emerald-500/20 hover:border-emerald-500/40 px-3.5 py-1.5 rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 cursor-pointer"
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
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Approved</span>
              </span>
            )}
            {provider.status === 'PENDING_REVIEW' && (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 uppercase tracking-wider">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Pending Review</span>
              </span>
            )}
            {provider.status === 'SUSPENDED' && (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/30 uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span>Suspended</span>
              </span>
            )}
            {provider.status === 'REJECTED' && (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-slate-500/15 text-slate-400 border border-slate-500/30 uppercase tracking-wider">
                <XCircle className="w-4 h-4 text-slate-400" />
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
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-emerald-500/10 disabled:opacity-50 cursor-pointer"
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
                <div className="bg-red-950/20 border border-red-500/20 rounded-xl p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-red-500/10 text-red-400 shrink-0">
                      <ShieldAlert className="w-4 h-4" />
                    </div>
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-red-400">Suspend Account</div>
                      <div className="text-xs leading-snug" style={{ color: 'var(--admin-text-secondary)' }}>
                        This will suspend the provider and restrict new bookings.
                      </div>
                    </div>
                  </div>
                  <button
                    disabled={submitting}
                    onClick={() => triggerStatusConfirm('SUSPENDED')}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 font-bold text-xs transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>Suspend Account</span>
                  </button>
                </div>
              )}

              {/* SUSPENDED Actions */}
              {provider.status === 'SUSPENDED' && (
                <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-emerald-400">Re-Approve Account</div>
                      <div className="text-xs leading-snug" style={{ color: 'var(--admin-text-secondary)' }}>
                        Restore provider access and re-enable automated & manual job allocations.
                      </div>
                    </div>
                  </div>
                  <button
                    disabled={submitting}
                    onClick={() => triggerStatusConfirm('APPROVED')}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all disabled:opacity-50 shadow-md shadow-emerald-500/10 cursor-pointer"
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
                      <UserCheck className="w-4 h-4 text-emerald-400" />
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
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all disabled:opacity-50 shadow-md shadow-emerald-500/10 cursor-pointer"
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
                <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
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
                        backgroundColor: isMapped ? 'rgba(16, 185, 129, 0.08)' : 'var(--admin-surface-hover)',
                        borderColor: isMapped ? 'rgba(16, 185, 129, 0.25)' : 'var(--admin-border)',
                      }}
                      className="flex items-center justify-between gap-4 p-4 rounded-xl transition-all border"
                    >
                      <div className="space-y-1 min-w-0 pr-2">
                        <div className="text-sm font-bold truncate flex items-center gap-2" style={{ color: 'var(--admin-text-primary)' }}>
                          <span>{cat.name}</span>
                          {isMapped && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block shrink-0" />
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
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/25 transition-all disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-red-500/30 cursor-pointer"
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
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/25 transition-all disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 cursor-pointer"
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
