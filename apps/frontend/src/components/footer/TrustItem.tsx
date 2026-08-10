'use client';

import React from 'react';
import { TrustIndicator } from '@/config/site';

export interface TrustItemProps {
  item: TrustIndicator;
}

export const TrustItem: React.FC<TrustItemProps> = ({ item }) => {
  const renderIcon = () => {
    switch (item.icon) {
      case 'shield':
        return (
          <svg className="w-5 h-5 text-emerald-400 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        );
      case 'clock':
        return (
          <svg className="w-5 h-5 text-emerald-400 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        );
      case 'lock':
        return (
          <svg className="w-5 h-5 text-emerald-400 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex items-start space-x-4 text-left">
      <div className="mt-0.5 flex-shrink-0">
        {renderIcon()}
      </div>
      <div>
        <h4 className="text-sm font-bold text-white leading-snug">
          {item.label}
        </h4>
        <p className="text-xs text-slate-400 font-normal leading-relaxed mt-1">
          {item.subtitle}
        </p>
      </div>
    </div>
  );
};

export default TrustItem;
