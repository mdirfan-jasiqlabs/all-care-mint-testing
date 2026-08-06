'use client';

import React from 'react';
import Link from 'next/link';
import { siteConfig } from '@/config/site';
import TrustItem from './TrustItem';

export const FooterBrand: React.FC = () => {
  const { logo, name, brandNameHighlight, footer } = siteConfig;

  return (
    <div className="space-y-6 flex flex-col justify-between h-full text-left">
      <div className="space-y-4">
        {/* Brand Logo */}
        <Link href="/" className="inline-flex items-center space-x-3 group cursor-pointer">
          <img
            src={logo.src}
            alt={logo.alt}
            className="w-9 h-9 object-contain rounded-xl border border-emerald-500/30 group-hover:border-emerald-400/60 transition-all shadow-sm"
          />
          <span className="tracking-tight text-white font-black text-xl sm:text-2xl">
            {name}-<span className="text-emerald-400 font-black">{brandNameHighlight}</span>
          </span>
        </Link>

        {/* Short Description */}
        <p className="text-slate-300 text-xs sm:text-sm leading-relaxed font-normal max-w-xs whitespace-pre-line">
          {footer.description}
        </p>
      </div>

      {/* Trust Indicators Horizontal Row */}
      <div className="pt-2">
        <div className="grid grid-cols-3 gap-3 divide-x divide-slate-800/80">
          {footer.trustIndicators.map((indicator, index) => (
            <div key={indicator.id} className={index > 0 ? 'pl-3' : ''}>
              <TrustItem item={indicator} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FooterBrand;
