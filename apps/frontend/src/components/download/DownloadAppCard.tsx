'use client';

import React from 'react';

export interface DownloadAppCardProps {
  children: React.ReactNode;
  className?: string;
}

export const DownloadAppCard: React.FC<DownloadAppCardProps> = ({
  children,
  className = '',
}) => {
  return (
    <div className="relative w-full max-w-[980px] mx-auto group">
      {/* Outer Ambient Radial Glow behind the CTA card */}
      <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 via-emerald-400/10 to-emerald-500/20 rounded-[30px] blur-xl opacity-50 group-hover:opacity-75 transition-opacity duration-500 pointer-events-none" />

      {/* Main Elevated Glass Card */}
      <div
        className={`relative bg-gradient-to-b from-[#07131f]/95 via-[#050d18]/95 to-[#040810]/95 border border-emerald-500/35 hover:border-emerald-400/60 rounded-[28px] sm:rounded-[32px] py-8 sm:py-10 md:py-12 px-5 sm:px-10 backdrop-blur-xl shadow-[0_0_40px_rgba(16,185,129,0.12)] transition-all duration-300 overflow-hidden text-center space-y-5 sm:space-y-6 ${className}`}
      >
        {/* Decorative 5x4 Dot Grid Pattern in Top-Left Corner */}
        <div
          className="absolute top-5 left-5 sm:top-6 sm:left-6 grid grid-cols-5 gap-1.5 opacity-25 group-hover:opacity-45 transition-opacity duration-300 pointer-events-none"
          aria-hidden="true"
        >
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="w-1 h-1 rounded-full bg-emerald-400/80" />
          ))}
        </div>

        {/* Decorative 5x4 Dot Grid Pattern in Top-Right Corner */}
        <div
          className="absolute top-5 right-5 sm:top-6 sm:right-6 grid grid-cols-5 gap-1.5 opacity-25 group-hover:opacity-45 transition-opacity duration-300 pointer-events-none"
          aria-hidden="true"
        >
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="w-1 h-1 rounded-full bg-emerald-400/80" />
          ))}
        </div>

        {/* Center Radial Soft Emerald Gradient Light */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        {/* Card Body Content */}
        <div className="relative z-10 space-y-4 sm:space-y-5 max-w-3xl mx-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

export default DownloadAppCard;
