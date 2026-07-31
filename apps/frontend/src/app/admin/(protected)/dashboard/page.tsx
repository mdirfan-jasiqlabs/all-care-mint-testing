'use client';

import React from 'react';

export default function AdminDashboardPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
      <div>
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
    </div>
  );
}
