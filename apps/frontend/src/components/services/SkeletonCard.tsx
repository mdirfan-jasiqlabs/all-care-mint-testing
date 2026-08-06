'use client';

import React from 'react';

export const SkeletonCard: React.FC = () => {
  return (
    <div
      className="bg-[#060d19]/80 border border-emerald-500/20 rounded-[22px] p-6 sm:p-7 flex flex-col justify-between h-full space-y-6 animate-pulse relative overflow-hidden"
      aria-hidden="true"
    >
      {/* Skeleton Top Section */}
      <div className="space-y-4">
        {/* Icon skeleton */}
        <div className="w-16 h-16 bg-slate-800/80 rounded-2xl border border-slate-700/50"></div>
        {/* Title skeleton */}
        <div className="h-6 bg-slate-800/80 rounded-md w-2/3"></div>
        {/* Divider line skeleton */}
        <div className="w-7 h-0.5 bg-emerald-500/30 rounded-full"></div>
        {/* Description skeleton */}
        <div className="space-y-2">
          <div className="h-3.5 bg-slate-800/80 rounded w-full"></div>
          <div className="h-3.5 bg-slate-800/80 rounded w-4/5"></div>
        </div>
      </div>

      {/* Skeleton CTA Pill */}
      <div className="pt-4">
        <div className="w-36 h-9 bg-slate-800/80 rounded-full border border-slate-700/50"></div>
      </div>
    </div>
  );
};

export default SkeletonCard;
