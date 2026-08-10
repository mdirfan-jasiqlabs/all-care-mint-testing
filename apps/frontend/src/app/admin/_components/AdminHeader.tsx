'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import BrandLogo from '@/components/BrandLogo';

interface AdminHeaderProps {
  onMenuClick?: () => void;
}

export default function AdminHeader({ onMenuClick }: AdminHeaderProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [csrfToken, setCsrfToken] = useState('');

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
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        backgroundColor: 'rgba(2, 6, 23, 0.85)',
        backdropFilter: 'blur(12px)',
        height: '76px',
        padding: '0 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 30,
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Hamburger Toggle Button: ONLY visible on screens < 1024px (lg:hidden) */}
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open menu"
          title="Open menu"
          className="flex lg:hidden items-center justify-center"
          style={{
            height: '44px',
            width: '44px',
            borderRadius: '10px',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#f8fafc',
            cursor: 'pointer',
            padding: 0,
            outline: 'none',
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        <BrandLogo href="/admin/dashboard" size="md" alt="All care mint Admin" />
      </div>

      <div style={{ display: 'flex', alignItems: 'center' }}>
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          aria-label="Log out"
          title="Log out"
          className="px-3 sm:px-5"
          style={{
            height: '44px',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: loggingOut ? 'not-allowed' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.2s ease-in-out',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            color: '#f87171',
            opacity: loggingOut ? 0.6 : 1,
            outline: 'none',
          }}
          onMouseEnter={(e) => {
            if (!loggingOut) {
              e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)';
              e.currentTarget.style.color = '#fca5a5';
            }
          }}
          onMouseLeave={(e) => {
            if (!loggingOut) {
              e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.25)';
              e.currentTarget.style.color = '#f87171';
            }
          }}
          onFocus={(e) => {
            e.currentTarget.style.boxShadow = '0 0 0 2px rgba(239, 68, 68, 0.5)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          {loggingOut ? (
            <span
              style={{
                width: '16px',
                height: '16px',
                border: '2px solid #f87171',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                display: 'inline-block',
                animation: 'spin 1s linear infinite',
              }}
            />
          ) : (
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#f87171"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              style={{ flexShrink: 0 }}
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          )}
          <span className="hidden sm:inline">Log Out</span>
        </button>
      </div>
    </header>
  );
}


