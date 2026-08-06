'use client';

import React from 'react';

export interface CTAButtonProps {
  label?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export const CTAButton: React.FC<CTAButtonProps> = ({
  label = 'Explore Services',
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className="inline-flex items-center space-x-2.5 bg-[#04121a]/90 border border-emerald-500/35 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-xs font-bold text-emerald-400 backdrop-blur-md group-hover:border-emerald-400 group-hover:bg-emerald-500/15 group-hover:shadow-[0_0_15px_rgba(16,185,129,0.2)] transition-all duration-300 pointer-events-auto"
    >
      <span className="tracking-wide">{label}</span>
      <svg
        className="w-3.5 h-3.5 text-emerald-400 group-hover:translate-x-1 transition-transform duration-300"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
      </svg>
    </div>
  );
};

export default CTAButton;
