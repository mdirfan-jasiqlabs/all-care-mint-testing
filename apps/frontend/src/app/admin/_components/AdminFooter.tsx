'use client';

import React from 'react';

export default function AdminFooter() {
  return (
    <footer
      id="admin-footer"
      className="w-full px-4 sm:px-8 py-3.5 flex items-center justify-start z-10 shrink-0 transition-colors duration-200"
      style={{
        backgroundColor: 'var(--admin-sidebar-bg)',
        borderTop: '1px solid var(--admin-border)',
        color: 'var(--admin-text-muted)',
      }}
    >
      <div className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
        <span className="font-medium" style={{ color: 'var(--admin-text-muted)' }}>
          © {new Date().getFullYear()} All Care Mint Operations Team
        </span>
      </div>
    </footer>
  );
}
