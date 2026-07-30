'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function CatalogTabs() {
  const router = useRouter();
  const pathname = usePathname();

  const isCategories = pathname.includes('/categories');
  const isPricing = pathname.includes('/pricing');

  const getTabStyle = (isActive: boolean) => {
    return {
      padding: '12px 24px',
      fontSize: '14px',
      fontWeight: isActive ? 700 : 500,
      color: isActive ? '#10b981' : '#94a3b8',
      background: 'none',
      border: 'none',
      borderBottom: isActive ? '2px solid #10b981' : '2px solid transparent',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      outline: 'none',
    };
  };

  return (
    <div
      style={{
        display: 'flex',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        marginBottom: '24px',
        gap: '8px',
      }}
    >
      <button
        id="tab-categories"
        onClick={() => router.push('/admin/catalog/categories')}
        style={getTabStyle(isCategories)}
      >
        Categories
      </button>
      <button
        id="tab-services"
        onClick={() => router.push('/admin/catalog/pricing')}
        style={getTabStyle(isPricing)}
      >
        Services
      </button>
    </div>
  );
}
