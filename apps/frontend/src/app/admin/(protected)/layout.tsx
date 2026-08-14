'use client';

import React, { useState } from 'react';
import { ToastProvider } from '../_components/Toast';
import AdminHeader from '../_components/AdminHeader';
import AdminSidebar from '../_components/AdminSidebar';
import AdminFooter from '../_components/AdminFooter';
import { CatalogETagProvider } from '../catalog/CatalogETagContext';
import { AdminThemeProvider } from '../_components/AdminThemeContext';

export default function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  return (
    <AdminThemeProvider>
      <CatalogETagProvider>
        <ToastProvider>
          {/* Viewport-locked shell: no document-level scroll */}
          <div
            style={{
              height: '100dvh',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: 'var(--admin-bg)',
              color: 'var(--admin-text-primary)',
              overflow: 'hidden',
              transition: 'background-color 0.2s ease, color 0.2s ease',
            }}
          >
            {/* Sticky header at top */}
            <AdminHeader onMenuClick={() => setIsMobileDrawerOpen(true)} />

            {/* Content row: sidebar (fixed) + main (scrollable) */}
            <div style={{ flex: 1, display: 'flex', minHeight: 0, position: 'relative' }}>
              {/* Sidebar: fills remaining height, responsive desktop fixed / mobile drawer */}
              <AdminSidebar
                isOpen={isMobileDrawerOpen}
                onClose={() => setIsMobileDrawerOpen(false)}
              />

              {/* Main content: only this area scrolls vertically */}
              <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div className="p-3 sm:p-6 lg:p-8" style={{ flex: 1 }}>
                  {children}
                </div>
                <AdminFooter />
              </main>
            </div>
          </div>
        </ToastProvider>
      </CatalogETagProvider>
    </AdminThemeProvider>
  );
}


