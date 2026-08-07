'use client';

import React from 'react';
import HeroSkeleton from './HeroSkeleton';
import CategoryGridSkeleton from './CategoryGridSkeleton';

export const PageSkeleton: React.FC = () => {
  return (
    <div aria-hidden="true" className="w-full flex-1 flex flex-col justify-between bg-[#060a12] text-slate-100 min-h-screen">
      <HeroSkeleton />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
        <div className="space-y-2 text-center sm:text-left">
          <div className="w-32 h-4 bg-slate-800 rounded-full animate-skeleton-shimmer" />
          <div className="w-64 h-8 bg-slate-800 rounded-lg animate-skeleton-shimmer" />
        </div>
        <CategoryGridSkeleton count={4} />
      </div>
    </div>
  );
};

export default PageSkeleton;
