'use client';

import React from 'react';

export interface TopIconWrapperProps {
  className?: string;
}

export const TopIconWrapper: React.FC<TopIconWrapperProps> = ({ className = '' }) => {
  return (
    <div className={`relative flex items-center justify-center mx-auto ${className}`}>
      {/* Outer ambient glow ring */}
      <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-lg pointer-events-none" />

      {/* Centered Circular Glass Icon Container */}
      <div className="relative w-13 h-13 sm:w-15 sm:h-15 rounded-full bg-[#051522]/95 border border-emerald-500/40 text-emerald-400 flex items-center justify-center backdrop-blur-md shadow-[0_0_20px_rgba(16,185,129,0.25)] transition-transform duration-300 hover:scale-105">
        {/* Smartphone Icon with Down Arrow Inside */}
        <svg
          className="w-6.5 h-6.5 sm:w-7.5 sm:h-7.5 text-emerald-400"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          {/* Outer Smartphone Frame */}
          <rect x="7" y="3" width="10" height="18" rx="2.5" strokeWidth="1.8" />
          {/* Top Speaker / Notch Dot */}
          <circle cx="12" cy="5.5" r="0.5" fill="currentColor" />
          {/* Down Arrow inside Phone Display */}
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.2"
            d="M12 9v6m0 0l-2.5-2.5M12 15l2.5-2.5"
          />
          {/* Bottom Bar Indicator */}
          <line x1="10" y1="18.5" x2="14" y2="18.5" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
};

export default TopIconWrapper;
