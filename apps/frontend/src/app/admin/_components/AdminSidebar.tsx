'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

interface AdminSidebarProps {
  activePage: 'dashboard' | 'catalog' | 'bookings' | 'users';
}

export default function AdminSidebar({ activePage }: AdminSidebarProps) {
  const router = useRouter();

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
            onClick={() => handleNav('/dashboard/admin')}
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
