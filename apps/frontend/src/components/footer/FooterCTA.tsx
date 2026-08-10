'use client';

import React from 'react';
import { siteConfig } from '@/config/site';
import PlayStoreButton from './PlayStoreButton';

export const FooterCTA: React.FC = () => {
  const { cta } = siteConfig.footer;

  return (
    <div className="flex flex-col items-start text-left w-full">
      {/* Circular Download Icon with Mint Glow Ring */}
      <div className="relative group">
        <div className="w-14 h-14 rounded-full border border-emerald-400/40 bg-emerald-950/30 text-emerald-400 flex items-center justify-center shadow-[0_0_25px_rgba(16,185,129,0.25)] group-hover:scale-105 group-hover:border-emerald-400 transition-all duration-300">
          <svg className="w-6 h-6 stroke-[1.75]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <rect x="7" y="2" width="10" height="20" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v7m0 0l-2.5-2.5M12 14l2.5-2.5" />
            <line x1="11" y1="18" x2="13" y2="18" strokeLinecap="round" />
          </svg>
        </div>
        <div className="absolute -inset-1 rounded-full bg-emerald-500/15 blur-md -z-10 group-hover:bg-emerald-500/25 transition-all" />
      </div>

      {/* Heading & Subtitle */}
      <div className="mt-6 max-w-xs">
        <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight leading-snug">
          Get the <span className="text-emerald-400 font-extrabold">All care mint</span> App
        </h3>
        <p className="text-xs sm:text-sm text-slate-400 font-normal leading-relaxed mt-3 whitespace-pre-line">
          {cta.description}
        </p>
      </div>

      {/* Google Play CTA Button */}
      <div className="mt-6.5">
        <PlayStoreButton />
      </div>
    </div>
  );
};

export default FooterCTA;
