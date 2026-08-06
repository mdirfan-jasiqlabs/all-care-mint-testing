'use client';

import React from 'react';

export interface PrimaryCTAButtonProps {
  label?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  isLoading?: boolean;
  disabled?: boolean;
  className?: string;
}

export const PrimaryCTAButton: React.FC<PrimaryCTAButtonProps> = ({
  label = 'Download Customer App',
  onClick,
  isLoading = false,
  disabled = false,
  className = '',
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      aria-label={isLoading ? 'Downloading Customer App...' : label}
      className={`group relative inline-flex items-center justify-center space-x-2.5 sm:space-x-3 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black px-6 sm:px-7 h-12 sm:h-13 rounded-xl sm:rounded-2xl text-xs sm:text-sm transition-all duration-200 shadow-[0_0_22px_rgba(16,185,129,0.35)] hover:shadow-[0_0_32px_rgba(16,185,129,0.5)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 cursor-pointer whitespace-nowrap ${className}`}
    >
      {/* Loading Spinner or Download Tray Icon */}
      {isLoading ? (
        <svg
          className="w-4.5 h-4.5 sm:w-5 sm:h-5 animate-spin text-slate-950 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : (
        <svg
          className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-slate-950 group-hover:translate-y-0.5 transition-transform duration-200 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          {/* Download Tray Line */}
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
          {/* Down Arrow */}
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0 0l-4-4m4 4l4-4" />
        </svg>
      )}

      <span className="tracking-tight whitespace-nowrap">{isLoading ? 'Downloading...' : label}</span>
    </button>
  );
};

export default PrimaryCTAButton;
