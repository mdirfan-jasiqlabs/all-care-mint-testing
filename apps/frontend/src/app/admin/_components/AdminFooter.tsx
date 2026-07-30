'use client';

import React from 'react';

export default function AdminFooter() {
  return (
    <footer
      id="admin-footer"
      style={{
        backgroundColor: '#020617', // slate-950
        padding: '16px 32px',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '12px',
        color: '#64748b', // slate-500
        width: '100%',
        zIndex: 10,
      }}
    >
      <span>© 2026 All Care Mint Operations Team</span>
      <div style={{ display: 'flex', gap: '16px' }}>
        <a href="#" style={{ color: '#64748b', textDecoration: 'none', transition: 'color 0.2s' }} className="hover-light">Security Policy</a>
        <a href="#" style={{ color: '#64748b', textDecoration: 'none', transition: 'color 0.2s' }} className="hover-light">System Status</a>
      </div>
    </footer>
  );
}
