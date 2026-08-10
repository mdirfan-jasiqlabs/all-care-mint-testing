'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import BrandLogo from '@/components/BrandLogo';
import { LogOut, Menu } from 'lucide-react';

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
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        backgroundColor: '#060b13',
        height: '72px',
        padding: '0 24px',
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
            height: '40px',
            width: '40px',
            borderRadius: '8px',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#f8fafc',
            cursor: 'pointer',
            padding: 0,
            outline: 'none',
          }}
        >
          <Menu size={20} />
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
          className="px-4 py-2"
          style={{
            height: '40px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: loggingOut ? 'not-allowed' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.2s ease-in-out',
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#ef4444',
            opacity: loggingOut ? 0.6 : 1,
            outline: 'none',
          }}
          onMouseEnter={(e) => {
            if (!loggingOut) {
              e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.18)';
              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.5)';
              e.currentTarget.style.color = '#f87171';
            }
          }}
          onMouseLeave={(e) => {
            if (!loggingOut) {
              e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.08)';
              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
              e.currentTarget.style.color = '#ef4444';
            }
          }}
        >
          {loggingOut ? (
            <span
              style={{
                width: '14px',
                height: '14px',
                border: '2px solid #ef4444',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                display: 'inline-block',
                animation: 'spin 1s linear infinite',
              }}
            />
          ) : (
            <LogOut size={16} color="#ef4444" />
          )}
          <span>Log Out</span>
        </button>
      </div>
    </header>
  );
}


