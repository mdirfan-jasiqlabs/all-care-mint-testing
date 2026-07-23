'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [csrfToken, setCsrfToken] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('csrf_token') || '';
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
        localStorage.removeItem('csrf_token');
      }
      router.push('/admin/login');
    } catch (err) {
      console.error('Logout error:', err);
      setLoggingOut(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Navigation Header */}
      <header
        style={{
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(9, 11, 17, 0.8)',
          backdropFilter: 'blur(12px)',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '16px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: 'var(--primary)',
                boxShadow: '0 0 10px var(--primary)',
              }}
            ></span>
            <h1 className="title-brand" style={{ fontSize: '20px', letterSpacing: '-0.5px' }}>
              All Care Mint
            </h1>
            <span
              style={{
                fontSize: '11px',
                background: 'rgba(255, 255, 255, 0.08)',
                padding: '2px 8px',
                borderRadius: '20px',
                color: 'var(--text-muted)',
                fontWeight: 600,
                textTransform: 'uppercase',
                marginLeft: '8px',
              }}
            >
              Console
            </span>
          </div>

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

      {/* Main Content Dashboard */}
      <main style={{ flex: 1, maxWidth: '1200px', width: '100%', margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 600, marginBottom: '8px' }}>
            System Integrity & Overview
          </h2>
          <p style={{ color: '#64748b' }}>
            Real-time verification metrics and platform baseline operations.
          </p>
        </div>

        {/* Info Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '24px',
            marginBottom: '48px',
          }}
        >
          {/* Card 1 */}
          <div
            style={{
              background: 'rgba(30, 41, 59, 0.4)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: 500, marginBottom: '12px' }}>
              Active Customers
            </div>
            <div style={{ fontSize: '36px', fontWeight: 700, color: '#fff' }}>2,840</div>
            <div style={{ color: 'var(--primary)', fontSize: '13px', marginTop: '8px', fontWeight: 500 }}>
              ↑ +12.4% this week
            </div>
          </div>

          {/* Card 2 */}
          <div
            style={{
              background: 'rgba(30, 41, 59, 0.4)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: 500, marginBottom: '12px' }}>
              Registered Providers
            </div>
            <div style={{ fontSize: '36px', fontWeight: 700, color: '#fff' }}>420</div>
            <div style={{ color: 'var(--primary)', fontSize: '13px', marginTop: '8px', fontWeight: 500 }}>
              98 Approved & Active
            </div>
          </div>

          {/* Card 3 */}
          <div
            style={{
              background: 'rgba(30, 41, 59, 0.4)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: 500, marginBottom: '12px' }}>
              System Error Rate
            </div>
            <div style={{ fontSize: '36px', fontWeight: 700, color: '#fff' }}>&lt; 0.18%</div>
            <div style={{ color: 'var(--primary)', fontSize: '13px', marginTop: '8px', fontWeight: 500 }}>
              Target benchmark &lt; 1.0%
            </div>
          </div>

          {/* Card 4 */}
          <div
            style={{
              background: 'rgba(30, 41, 59, 0.4)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: 500, marginBottom: '12px' }}>
              Platform Uptime
            </div>
            <div style={{ fontSize: '36px', fontWeight: 700, color: 'var(--primary)' }}>99.98%</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '8px', fontWeight: 500 }}>
              Continual health monitoring active
            </div>
          </div>
        </div>

        {/* Security / System Logs Container */}
        <div
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            borderRadius: '20px',
            padding: '32px',
            boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.02)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600 }}>Active Lockouts & Audit Events</h3>
            <span style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 500 }}>
              ● Live Feed Active
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div
              style={{
                background: 'rgba(0, 0, 0, 0.2)',
                borderRadius: '10px',
                padding: '12px 16px',
                fontSize: '13px',
                fontFamily: 'monospace',
                color: '#cbd5e1',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span>[AUDIT] Platform & Auth Foundation database initialized</span>
              <span style={{ color: 'var(--text-muted)' }}>Just now</span>
            </div>
            <div
              style={{
                background: 'rgba(0, 0, 0, 0.2)',
                borderRadius: '10px',
                padding: '12px 16px',
                fontSize: '13px',
                fontFamily: 'monospace',
                color: '#cbd5e1',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span>[INFO] Admin user authenticated via BFF session token</span>
              <span style={{ color: 'var(--text-muted)' }}>1 min ago</span>
            </div>
            <div
              style={{
                background: 'rgba(0, 0, 0, 0.2)',
                borderRadius: '10px',
                padding: '12px 16px',
                fontSize: '13px',
                fontFamily: 'monospace',
                color: '#cbd5e1',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span>[SEC] Zero active lockouts reported for admin accounts</span>
              <span style={{ color: 'var(--text-muted)' }}>5 mins ago</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
