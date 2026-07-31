'use client';

import React, { useState, useEffect } from 'react';
import { ToastProvider } from '../_components/Toast';
import AdminHeader from '../_components/AdminHeader';
import AdminSidebar from '../_components/AdminSidebar';
import AdminFooter from '../_components/AdminFooter';
import { CatalogETagProvider } from '../catalog/CatalogETagContext';

export default function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <CatalogETagProvider>
      <ToastProvider>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'hsl(224, 71%, 4%)', color: '#f8fafc' }}>
          <AdminHeader />
          <div style={{ flex: 1, display: 'flex', position: 'relative' }}>
            <AdminSidebar />
            <main style={{ flex: 1, padding: '32px', display: 'flex', flexDirection: 'column', overflowX: 'hidden' }}>
              {children}
            </main>
          </div>
          <AdminFooter />
        </div>

        {mounted && isMobile && (
          <div className="overlay-backdrop">
            <div className="overlay-icon overlay-icon--danger">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
            </div>
            <h2 className="overlay-title">Unsupported Device</h2>
            <p className="overlay-description">Admin Operations Console requires a desktop resolution.</p>
          </div>
        )}
      </ToastProvider>
    </CatalogETagProvider>
  );
}
