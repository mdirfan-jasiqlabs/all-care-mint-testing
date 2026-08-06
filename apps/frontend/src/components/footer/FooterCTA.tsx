'use client';

import React from 'react';
import { siteConfig } from '@/config/site';
import PlayStoreButton from './PlayStoreButton';

export const FooterCTA: React.FC = () => {
  const { cta } = siteConfig.footer;

  return (
    <div className="flex flex-col items-center justify-center text-center space-y-4 h-full py-2">
      {/* Large Circular Download Icon with Mint Glow Ring */}
      <div className="relative group">
        <div className="w-14 h-14 rounded-full border border-emerald-400/50 bg-[#041624] text-emerald-400 flex items-center justify-center shadow-[0_0_25px_rgba(16,185,129,0.35)] group-hover:scale-105 group-hover:border-emerald-400 transition-all duration-300">
          <svg className="w-6 h-6 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
        {/* Soft outer glow circle */}
        <div className="absolute -inset-1 rounded-full bg-emerald-500/20 blur-md -z-10 group-hover:bg-emerald-500/30 transition-all" />
      </div>

      {/* Heading & Subtitle */}
      <div className="space-y-1 max-w-xs">
        <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
          {cta.title}
        </h3>
        <p className="text-xs text-slate-300 font-normal leading-relaxed whitespace-pre-line">
          {cta.description}
        </p>
      </div>

      {/* Google Play CTA Button */}
      <div className="pt-1">
        <PlayStoreButton />
      </div>
    </div>
  );
};

export default FooterCTA;
