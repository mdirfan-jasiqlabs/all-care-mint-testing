'use client';

import React from 'react';

export interface PlayStoreButtonProps {
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
}

export const PlayStoreButton: React.FC<PlayStoreButtonProps> = ({
  onClick,
  className = '',
}) => {
  return (
    <button
      onClick={onClick}
      aria-label="Get it on Google Play"
      className={`inline-flex items-center justify-center space-x-3 bg-[#050a14] hover:bg-[#081324] border border-emerald-500/30 hover:border-emerald-400 text-white px-5 sm:px-6 h-12 sm:h-13 rounded-xl sm:rounded-2xl transition-all duration-300 shadow-md hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 cursor-pointer whitespace-nowrap ${className}`}
    >
      {/* Official Google Play Colorful Multi-Path SVG Logo */}
      <svg
        className="w-6 h-6 sm:w-6.5 sm:h-6.5 flex-shrink-0"
        viewBox="0 0 512 512"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M32.5 17.5C30.2 19.8 29 23.2 29 27.5V484.5C29 488.8 30.2 492.2 32.5 494.5L33.7 495.7L276.7 252.7V249.3L33.7 6.3L32.5 17.5Z"
          fill="url(#gplay_a_cta)"
        />
        <path
          d="M357.7 333.7L276.7 252.7V249.3L357.7 168.3L359.1 169.1L455.1 223.7C482.5 239.3 482.5 264.7 455.1 280.3L359.1 334.9L357.7 333.7Z"
          fill="url(#gplay_b_cta)"
        />
        <path
          d="M359.1 334.9L276.7 252.7L32.5 494.5C40.6 503.1 53.6 504.2 68.7 495.7L359.1 334.9Z"
          fill="url(#gplay_c_cta)"
        />
        <path
          d="M359.1 169.1L68.7 8.3C53.6-.2 40.6.9 32.5 9.5L276.7 252.7L359.1 169.1Z"
          fill="url(#gplay_d_cta)"
        />
        <defs>
          <linearGradient id="gplay_a_cta" x1="254" y1="23" x2="16" y2="261" gradientUnits="userSpaceOnUse">
            <stop stopColor="#00A0FF" />
            <stop offset="1" stopColor="#00A1FF" />
          </linearGradient>
          <linearGradient id="gplay_b_cta" x1="486" y1="256" x2="272" y2="256" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFCC00" />
            <stop offset="1" stopColor="#FFAA00" />
          </linearGradient>
          <linearGradient id="gplay_c_cta" x1="337" y1="313" x2="68" y2="502" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FF3A44" />
            <stop offset="1" stopColor="#C31162" />
          </linearGradient>
          <linearGradient id="gplay_d_cta" x1="68" y1="10" x2="337" y2="199" gradientUnits="userSpaceOnUse">
            <stop stopColor="#00E676" />
            <stop offset="1" stopColor="#00B0FF" />
          </linearGradient>
        </defs>
      </svg>

      {/* Text Container */}
      <div className="text-left leading-tight">
        <span className="text-[8px] sm:text-[9px] font-bold tracking-wider text-slate-400 uppercase block">
          GET IT ON
        </span>
        <span className="text-xs sm:text-sm font-extrabold text-white tracking-tight block">
          Google Play
        </span>
      </div>
    </button>
  );
};

export default PlayStoreButton;
