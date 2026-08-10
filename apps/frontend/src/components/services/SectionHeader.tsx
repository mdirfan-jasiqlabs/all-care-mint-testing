'use client';

import React from 'react';
import Badge from './Badge';

export interface SectionHeaderProps {
  code?: string;
  badgeLabel?: string;
  titlePrefix?: string;
  titleHighlight?: string;
  subtitleLine1?: string;
  subtitleLine2?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  code = 'PG-WEB-003',
  badgeLabel = 'CATALOG BROWSER',
  titlePrefix = 'Service',
  titleHighlight = 'Categories',
  subtitleLine1 = 'Browse active service categories available on All care mint.',
  subtitleLine2 = 'Book instantly inside our Customer Mobile App.',
  onRefresh,
  isRefreshing = false,
}) => {
  return (
    <div className="space-y-5 text-center max-w-[900px] mx-auto">
      {/* Top Badge & Optional Refresh Button Row */}
      <div className="flex items-center justify-center relative">
        <Badge code={code} label={badgeLabel} />

        {onRefresh && (
          <div className="absolute right-0 top-1/2 -translate-y-1/2 hidden sm:block">
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center space-x-2 bg-[#050e18]/80 hover:bg-[#091624] border border-[#14263b] hover:border-emerald-500/50 text-slate-300 hover:text-white disabled:opacity-50 px-3.5 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md transition-all cursor-pointer"
              aria-label="Refresh service categories list"
              title="Refresh categories list"
            >
              <svg
                className={`w-3.5 h-3.5 text-emerald-400 ${isRefreshing ? 'animate-spin' : ''}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Heading */}
      <div>
        <h2 id="service-categories-heading" className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-tight tracking-tight">
          {titlePrefix} <span className="text-emerald-400 font-black">{titleHighlight}</span>
        </h2>
      </div>

      {/* Subtitle Description */}
      <div className="max-w-[700px] mx-auto">
        <p className="text-slate-400 text-sm sm:text-base leading-relaxed font-normal">
          {subtitleLine1}
          <br className="hidden sm:inline" /> {subtitleLine2}
        </p>
      </div>
    </div>
  );
};

export default SectionHeader;
