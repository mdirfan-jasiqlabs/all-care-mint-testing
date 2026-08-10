'use client';

import React from 'react';
import Link from 'next/link';
import { siteConfig } from '@/config/site';
import TrustItem from './TrustItem';

export const FooterBrand: React.FC = () => {
  const { logo, name, brandNameHighlight, footer } = siteConfig;

  return (
    <div className="space-y-6 flex flex-col justify-between text-left">
      <div className="space-y-3.5">
        {/* Brand Logo & Name */}
        <Link href="/" className="inline-flex items-center space-x-3 group cursor-pointer focus:outline-none">
          <img
            src={logo.src}
            alt={logo.alt}
            className="w-9 h-9 sm:w-10 sm:h-10 object-contain rounded-xl border border-emerald-500/30 group-hover:border-emerald-400/60 transition-all shadow-sm"
          />
          <span className="tracking-tight text-white font-black text-2xl sm:text-3xl">
            {name}{' '}<span className="text-emerald-400 font-extrabold">{brandNameHighlight}</span>
          </span>
        </Link>

        {/* Short Description */}
        <p className="text-slate-300 text-sm leading-relaxed font-normal max-w-xs whitespace-pre-line">
          {footer.description}
        </p>
      </div>

      {/* Vertical Trust Indicators Stack */}
      <div className="pt-2 flex flex-col space-y-4">
        {footer.trustIndicators.map((indicator) => (
          <TrustItem key={indicator.id} item={indicator} />
        ))}
      </div>
    </div>
  );
};

export default FooterBrand;
