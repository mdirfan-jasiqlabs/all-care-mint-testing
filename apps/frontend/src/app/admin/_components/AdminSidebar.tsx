'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface AdminSidebarProps {
  activePage?: 'dashboard' | 'catalog' | 'bookings' | 'users' | 'providers' | 'provider-leads';
}

export default function AdminSidebar({ activePage: activePageProp }: AdminSidebarProps) {
  const router = useRouter();
  const pathname = usePathname() || '';
  const [badgeCount, setBadgeCount] = React.useState<number>(0);

  React.useEffect(() => {
    let isMounted = true;
    const fetchBadgeCounts = async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') || localStorage.getItem('token') : null;
        const res = await fetch('/api/v1/admin/notifications/badge-counts', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
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

  const getActivePage = (): string => {
    if (activePageProp) return activePageProp;
    if (pathname.startsWith('/admin/catalog')) return 'catalog';
    if (pathname.startsWith('/admin/bookings')) return 'bookings';
    if (pathname.startsWith('/admin/providers/leads')) return 'provider-leads';
    if (pathname.startsWith('/admin/providers')) return 'providers';
    if (pathname.startsWith('/admin/payments')) return 'payments';
    if (pathname.startsWith('/admin/ratings')) return 'ratings';
    if (pathname.startsWith('/admin/users')) return 'users';
    if (pathname.startsWith('/dashboard/admin') || pathname.startsWith('/admin/dashboard')) return 'dashboard';
    return '';
  };

  const activePage = getActivePage();

  const handleNav = (path: string) => {
    router.push(path);
  };

  const getLinkStyle = (page: string) => {
    const isActive = activePage === page;
    return {
      display: 'flex',
      alignItems: 'center',
      padding: '12px 16px',
      borderRadius: '8px',
      color: isActive ? '#10b981' : '#94a3b8',
      backgroundColor: isActive ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
      border: 'none',
      fontSize: '14px',
      fontWeight: isActive ? 700 : 500,
      cursor: 'pointer',
      textAlign: 'left' as const,
      width: '100%',
      transition: 'all 0.2s ease',
    };
  };

  return (
    <aside
      id="admin-sidebar"
      style={{
        width: '240px',
        backgroundColor: '#020617',
        borderRight: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '24px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        flexShrink: 0,
        overflowY: 'auto',
      }}
    >
      <div>
        <div
          style={{
            fontSize: '10px',
            color: '#64748b',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '1px',
            marginBottom: '12px',
            paddingLeft: '8px',
          }}
        >
          Console Navigation
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <button
            onClick={() => handleNav('/admin/dashboard')}
            style={getLinkStyle('dashboard')}
          >
            Dashboard
          </button>
          <button
            onClick={() => handleNav('/admin/catalog/categories')}
            style={getLinkStyle('catalog')}
          >
            Service Catalog *
          </button>
          <button
            onClick={() => handleNav('/admin/bookings')}
            style={getLinkStyle('bookings')}
          >
            Manage Bookings
          </button>
          <button
            onClick={() => handleNav('/admin/providers')}
            style={getLinkStyle('providers')}
          >
            Providers Directory
          </button>
          <button
            onClick={() => handleNav('/admin/providers/leads')}
            style={getLinkStyle('provider-leads')}
            aria-live="polite"
          >
            <span>Provider Application Leads</span>
            {badgeCount > 0 && (
              <span
                id="provider-leads-badge"
                aria-label={`${badgeCount} unread provider leads`}
                style={{
                  marginLeft: 'auto',
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
                <span style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', borderWidth: 0 }}>
                  unread provider leads
                </span>
              </span>
            )}
          </button>
          <button
            onClick={() => handleNav('/admin/payments')}
            style={getLinkStyle('payments')}
          >
            Payments & Cash Ledger
          </button>
          <button
            onClick={() => handleNav('/admin/ratings')}
            style={getLinkStyle('ratings')}
          >
            Provider Ratings & Feedback
          </button>
          <button
            style={getLinkStyle('users')}
            disabled
          >
            Users & Access
          </button>
        </nav>
      </div>
    </aside>
  );
}
