'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useCatalogETag } from '../catalog/CatalogETagContext';

import BrandLogo from '@/components/BrandLogo';

export default function AdminHeader() {
  const router = useRouter();
  const pathname = usePathname() || '';
  const [loggingOut, setLoggingOut] = useState(false);
  const [csrfToken, setCsrfToken] = useState('');
  const { etag } = useCatalogETag();

  const getModuleBadge = () => {
    if (pathname.includes('/admin/reports') || pathname.includes('/admin/dashboard')) {
      return 'MOD-007';
    }
    if (pathname.includes('/admin/catalog')) {
      return 'MOD-001';
    }
    return 'MOD-007';
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = sessionStorage.getItem('csrf_token') || localStorage.getItem('csrf_token') || '';
      setCsrfToken(token);
    }
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
      });
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('csrf_token');
        sessionStorage.removeItem('access_token');
        localStorage.removeItem('csrf_token');
        localStorage.removeItem('access_token');
      }
      router.push('/login/admin');
    } catch (err) {
      console.error('Logout error:', err);
      setLoggingOut(false);
    }
  };

  return (
    <header
      style={{
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        backgroundColor: 'rgba(2, 6, 23, 0.8)',
        backdropFilter: 'blur(12px)',
        padding: '16px 32px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 20,
        width: '100%',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <BrandLogo size="md" />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'right' }}>
          <span style={{ fontSize: '10px', color: '#10b981', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', fontFamily: 'monospace' }}>
            ETag Header active
          </span>
          <span id="etag-val" style={{ fontSize: '10px', color: '#64748b', fontFamily: 'monospace' }}>
            {etag}
          </span>
        </div>
        <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)', fontSize: '12px', padding: '4px 12px', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
          {getModuleBadge()}
        </span>
        <span style={{ background: '#1e293b', color: '#cbd5e1', fontSize: '12px', padding: '4px 12px', borderRadius: '20px', fontWeight: 600 }}>
          Admin Panel
        </span>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          style={{
            background: 'transparent',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            color: '#94a3b8',
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s',
          }}
        >
          {loggingOut ? (
            <span className="spinner" style={{ width: '14px', height: '14px' }}></span>
          ) : (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          )}
          <span>Log Out</span>
        </button>
      </div>
    </header>
  );
}
