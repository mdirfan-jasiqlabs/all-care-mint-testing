'use client';

import React from 'react';

export interface BadgeProps {
  label?: string;
  code?: string;
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  code,
  label = 'CATALOG BROWSER',
}) => {
  return (
    <div className="inline-flex items-center space-x-2.5 bg-[#04141c]/95 border border-emerald-500/40 px-4 py-1.5 sm:py-2 rounded-full backdrop-blur-md shadow-[0_0_18px_rgba(16,185,129,0.18)] text-emerald-400 text-xs sm:text-xs font-bold uppercase tracking-wider">
      {/* Catalog Grid Icon (4 small squares) */}
      <svg
        className="w-4 h-4 text-emerald-400 flex-shrink-0"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
        />
      </svg>
      <span>
        {code ? `${code} • ${label}` : label}
      </span>
    </div>
  );
};

export default Badge;
