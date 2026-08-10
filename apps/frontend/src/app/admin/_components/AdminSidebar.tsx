'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  House,
  LayoutGrid,
  CalendarDays,
  Users,
  ClipboardCheck,
  Wallet,
  Star,
  ChartNoAxesCombined,
  UsersRound,
} from 'lucide-react';

interface AdminSidebarProps {
  activePage?: 'dashboard' | 'catalog' | 'bookings' | 'users' | 'providers' | 'provider-leads' | 'reports';
  isOpen?: boolean;
  onClose?: () => void;
}

export default function AdminSidebar({ activePage: activePageProp, isOpen = false, onClose }: AdminSidebarProps) {
  const router = useRouter();
  const pathname = usePathname() || '';
  const [badgeCount, setBadgeCount] = React.useState<number>(0);

  React.useEffect(() => {
    let isMounted = true;
    const fetchBadgeCounts = async () => {
      try {
        const token =
          typeof window !== 'undefined'
            ? sessionStorage.getItem('access_token') ||
              localStorage.getItem('access_token') ||
              localStorage.getItem('admin_token') ||
              localStorage.getItem('token')
            : null;

        if (!token) return;

        const res = await fetch('/api/v1/admin/notifications/badge-counts', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && isMounted) {
            setBadgeCount(json.data?.provider_leads ?? 0);
          }
        }
      } catch (err) {
        // Ignore fetch errors silently
      }
    };

    fetchBadgeCounts();
    const interval = setInterval(fetchBadgeCounts, 30000);

    const handleReadEvent = () => {
      fetchBadgeCounts();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('provider-leads-read', handleReadEvent);
    }

    return () => {
      isMounted = false;
      clearInterval(interval);
      if (typeof window !== 'undefined') {
        window.removeEventListener('provider-leads-read', handleReadEvent);
      }
    };
  }, []);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const getActivePage = (): string => {
    if (activePageProp) return activePageProp;
    if (pathname.startsWith('/admin/catalog')) return 'catalog';
    if (pathname.startsWith('/admin/bookings')) return 'bookings';
    if (pathname.startsWith('/admin/providers/leads')) return 'provider-leads';
    if (pathname.startsWith('/admin/providers')) return 'providers';
    if (pathname.startsWith('/admin/payments')) return 'payments';
    if (pathname.startsWith('/admin/ratings')) return 'ratings';
    if (pathname.startsWith('/admin/reports')) return 'reports';
    if (pathname.startsWith('/admin/users')) return 'users';
    if (pathname.startsWith('/dashboard/admin') || pathname.startsWith('/admin/dashboard')) return 'dashboard';
    return '';
  };

  const activePage = getActivePage();

  const handleNav = (path: string) => {
    if (onClose) onClose();
    router.push(path);
  };

  const getLinkStyle = (page: string) => {
    const isActive = activePage === page;
    return {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '10px 14px',
      borderRadius: '10px',
      color: isActive ? '#10b981' : '#94a3b8',
      backgroundColor: isActive ? 'rgba(16, 185, 129, 0.12)' : 'transparent',
      border: isActive ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid transparent',
      fontSize: '13px',
      fontWeight: isActive ? 600 : 500,
      cursor: 'pointer',
      textAlign: 'left' as const,
      width: '100%',
      transition: 'all 0.15s ease',
      minHeight: '42px',
    };
  };

  const navContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Section 1: CONSOLE NAVIGATION */}
      <div>
        <div
          style={{
            fontSize: '11px',
            color: '#64748b',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.8px',
            marginBottom: '12px',
            paddingLeft: '4px',
          }}
        >
          CONSOLE NAVIGATION
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <button
            onClick={() => handleNav('/admin/dashboard')}
            style={getLinkStyle('dashboard')}
          >
            <House size={18} color={activePage === 'dashboard' ? '#10b981' : '#94a3b8'} />
            <span>Dashboard</span>
          </button>
          <button
            onClick={() => handleNav('/admin/catalog/categories')}
            style={getLinkStyle('catalog')}
          >
            <LayoutGrid size={18} color={activePage === 'catalog' ? '#10b981' : '#94a3b8'} />
            <span>Service Catalog</span>
          </button>
          <button
            onClick={() => handleNav('/admin/bookings')}
            style={getLinkStyle('bookings')}
          >
            <CalendarDays size={18} color={activePage === 'bookings' ? '#10b981' : '#94a3b8'} />
            <span>Manage Bookings</span>
          </button>
          <button
            onClick={() => handleNav('/admin/providers')}
            style={getLinkStyle('providers')}
          >
            <Users size={18} color={activePage === 'providers' ? '#10b981' : '#94a3b8'} />
            <span>Providers Directory</span>
          </button>
          <button
            onClick={() => handleNav('/admin/providers/leads')}
            style={getLinkStyle('provider-leads')}
            aria-live="polite"
          >
            <ClipboardCheck size={18} color={activePage === 'provider-leads' ? '#10b981' : '#94a3b8'} />
            <span style={{ flex: 1 }}>Provider Application Leads</span>
            {badgeCount > 0 && (
              <span
                id="provider-leads-badge"
                aria-label={`${badgeCount} unread provider leads`}
                style={{
                  backgroundColor: '#ef4444',
                  color: '#ffffff',
                  borderRadius: '9999px',
                  padding: '2px 8px',
                  fontSize: '11px',
                  fontWeight: 700,
                  boxShadow: '0 0 8px rgba(239, 68, 68, 0.6)',
                }}
              >
                {badgeCount > 99 ? '99+' : badgeCount}
              </span>
            )}
          </button>
          <button
            onClick={() => handleNav('/admin/payments')}
            style={getLinkStyle('payments')}
          >
            <Wallet size={18} color={activePage === 'payments' ? '#10b981' : '#94a3b8'} />
            <span>Payments & Cash Ledger</span>
          </button>
          <button
            onClick={() => handleNav('/admin/ratings')}
            style={getLinkStyle('ratings')}
          >
            <Star size={18} color={activePage === 'ratings' ? '#10b981' : '#94a3b8'} />
            <span>Provider Ratings & Feedback</span>
          </button>
          <button
            onClick={() => handleNav('/admin/reports')}
            style={getLinkStyle('reports')}
          >
            <ChartNoAxesCombined size={18} color={activePage === 'reports' ? '#10b981' : '#94a3b8'} />
            <span>Analytics & Reports</span>
          </button>
        </nav>
      </div>

      {/* Section 2: USERS & ACCESS */}
      <div>
        <div
          style={{
            fontSize: '11px',
            color: '#64748b',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.8px',
            marginBottom: '12px',
            paddingLeft: '4px',
          }}
        >
          USERS & ACCESS
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <button
            onClick={() => handleNav('/admin/users')}
            style={{ ...getLinkStyle('users'), opacity: 0.55 }}
          >
            <UsersRound size={18} color={activePage === 'users' ? '#10b981' : '#94a3b8'} />
            <span>Users & Access</span>
          </button>
        </nav>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Permanent Sidebar */}
      <aside
        id="admin-sidebar"
        className="hidden lg:flex"
        style={{
          width: '260px',
          backgroundColor: '#060b13',
          borderRight: '1px solid rgba(255, 255, 255, 0.06)',
          padding: '24px 16px',
          flexDirection: 'column',
          gap: '24px',
          flexShrink: 0,
          overflowY: 'auto',
        }}
      >
        {navContent}
      </aside>

      {/* Mobile / Tablet Drawer Overlay */}
      {isOpen && (
        <div className="lg:hidden" style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex' }}>
          {/* Backdrop */}
          <div
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(2, 6, 23, 0.75)',
              backdropFilter: 'blur(4px)',
            }}
          />

          {/* Drawer Panel */}
          <div
            style={{
              position: 'relative',
              width: '280px',
              maxWidth: '85vw',
              backgroundColor: '#020617',
              borderRight: '1px solid rgba(255, 255, 255, 0.1)',
              height: '100%',
              padding: '20px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              zIndex: 51,
              boxShadow: '8px 0 24px rgba(0, 0, 0, 0.5)',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#10b981' }}>Navigation</span>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close navigation menu"
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#94a3b8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>
            {navContent}
          </div>
        </div>
      )}
    </>
  );
}

