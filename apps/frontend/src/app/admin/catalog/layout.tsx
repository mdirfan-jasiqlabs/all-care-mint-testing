'use client';

import React from 'react';
import { ToastProvider } from '../_components/Toast';
import AdminHeader from '../_components/AdminHeader';
import AdminSidebar from '../_components/AdminSidebar';
import CatalogTabs from '../_components/CatalogTabs';

export default function CatalogLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <AdminHeader />
        <div style={{ flex: 1, display: 'flex', position: 'relative' }}>
          <AdminSidebar activePage="catalog" />
          <main style={{ flex: 1, padding: '32px', display: 'flex', flexDirection: 'column', overflowX: 'hidden' }}>
            <CatalogTabs />
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
