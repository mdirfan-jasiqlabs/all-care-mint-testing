'use client';

import React from 'react';
import { ToastProvider } from '../_components/Toast';
import AdminHeader from '../_components/AdminHeader';
import AdminSidebar from '../_components/AdminSidebar';
import AdminFooter from '../_components/AdminFooter';

export default function ProvidersLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <AdminHeader />
        <div style={{ flex: 1, display: 'flex', position: 'relative' }}>
          <AdminSidebar activePage="providers" />
          <main style={{ flex: 1, padding: '32px', display: 'flex', flexDirection: 'column', overflowX: 'hidden' }}>
            {children}
          </main>
        </div>
        <AdminFooter />
      </div>
    </ToastProvider>
  );
}
