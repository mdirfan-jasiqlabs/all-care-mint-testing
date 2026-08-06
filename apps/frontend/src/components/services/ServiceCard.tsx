'use client';

import React from 'react';
import Link from 'next/link';

export interface CategoryData {
  id: string;
  name: string;
  description: string;
  iconUrl?: string;
}

export interface ServiceCardProps {
  category: CategoryData;
}

// Dynamic Icon Renderer based on category name
const renderCategoryIcon = (name: string) => {
  const lowerName = name.toLowerCase();

  if (lowerName.includes('clean') || lowerName.includes('sanit')) {
    // Broom / Cleaning Icon
    return (
      <svg className="w-7 h-7 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 21l8-8m0 0l-3-3m3 3l3 3m-3-3L18.5 5.5a2.121 2.121 0 013 3L11 18.5z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l4 4" />
      </svg>
    );
  }

  if (lowerName.includes('ac') || lowerName.includes('air') || lowerName.includes('cool')) {
    // AC / Snowflake Unit Icon
    return (
      <svg className="w-7 h-7 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <rect x="3" y="6" width="18" height="9" rx="2" strokeWidth="1.8" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 11h10M7 18t1.5-2 1.5 2M12 18t1.5-2 1.5 2M17 18t1.5-2 1.5 2" />
      </svg>
    );
  }

  if (lowerName.includes('plumb') || lowerName.includes('pipe') || lowerName.includes('tap') || lowerName.includes('drain')) {
    // Water Tap / Faucet Icon
    return (
      <svg className="w-7 h-7 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v4m0 0H8a2 2 0 00-2 2v2h12v-2a2 2 0 00-2-2h-4zm-4 8v3a2 2 0 002 2h4a2 2 0 002-2v-3" />
        <circle cx="12" cy="18" r="1" fill="currentColor" />
      </svg>
    );
  }

  if (lowerName.includes('paint') || lowerName.includes('wall') || lowerName.includes('decor')) {
    // Paint Roller Icon
    return (
      <svg className="w-7 h-7 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4h14a2 2 0 012 2v3a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zm14 7v3a2 2 0 01-2 2h-5v5h-2v-5H4" />
        <circle cx="14" cy="8" r="1" fill="currentColor" />
      </svg>
    );
  }

  if (lowerName.includes('electric') || lowerName.includes('wire') || lowerName.includes('switch') || lowerName.includes('fan')) {
    // Lightning Bolt Icon
    return (
      <svg className="w-7 h-7 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    );
  }

  if (lowerName.includes('appliance') || lowerName.includes('refriger') || lowerName.includes('geyser')) {
    // Appliance Wrench / Gear Icon
    return (
      <svg className="w-7 h-7 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <circle cx="12" cy="12" r="3" strokeWidth="1.8" />
      </svg>
    );
  }

  // Default Grid / Service Icon
  return (
    <svg className="w-7 h-7 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  );
};

export const ServiceCard: React.FC<ServiceCardProps> = ({ category }) => {
  return (
    <Link href="/services" className="block group h-full">
      <div className="relative bg-[#060d19]/90 border border-emerald-500/30 hover:border-emerald-400 rounded-[22px] p-6 sm:p-7 flex flex-col justify-between h-full backdrop-blur-xl shadow-lg hover:shadow-[0_10px_30px_rgba(16,185,129,0.18)] transition-all duration-300 hover:-translate-y-1 overflow-hidden">
        
        {/* Decorative 5x4 Dot Grid in Top-Right Corner */}
        <div className="absolute top-5 right-5 grid grid-cols-5 gap-1.5 opacity-25 group-hover:opacity-45 transition-opacity duration-300 pointer-events-none" aria-hidden="true">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="w-1 h-1 rounded-full bg-emerald-400" />
          ))}
        </div>

        <div className="relative z-10 space-y-4">
          {/* Large Service Icon Container */}
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center transition-all duration-300 group-hover:scale-105 group-hover:border-emerald-400 group-hover:shadow-[0_0_20px_rgba(16,185,129,0.25)]">
            {renderCategoryIcon(category.name)}
          </div>

          {/* Title & Mint Accent Bar */}
          <div>
            <h3 className="text-lg font-extrabold text-white tracking-tight leading-snug">
              {category.name}
            </h3>
            {/* Small mint accent divider */}
            <div className="w-7 h-0.5 bg-emerald-400 rounded-full my-3 group-hover:w-11 transition-all duration-300" />
          </div>

          {/* Description */}
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
            {category.description || 'Professional on-demand home service category.'}
          </p>
        </div>

        {/* Bottom CTA Pill Button */}
        <div className="relative z-10 pt-6 mt-2">
          <div className="inline-flex items-center space-x-2 bg-[#04121a]/90 border border-emerald-500/30 px-4 py-2 rounded-full text-xs font-bold text-emerald-400 backdrop-blur-md group-hover:border-emerald-400/60 group-hover:bg-emerald-500/10 transition-all duration-200">
            <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </span>
            <span>View Services</span>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default ServiceCard;
