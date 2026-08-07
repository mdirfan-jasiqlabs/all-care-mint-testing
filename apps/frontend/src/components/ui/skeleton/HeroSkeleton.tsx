'use client';

import React from 'react';
import Skeleton from './Skeleton';
import SkeletonTitle from './SkeletonTitle';
import SkeletonText from './SkeletonText';
import SkeletonButton from './SkeletonButton';

export const HeroSkeleton: React.FC = () => {
  return (
    <div aria-hidden="true" className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Column Content */}
        <div className="lg:col-span-7 space-y-6">
          <Skeleton className="h-6 w-48 rounded-full" />
          <SkeletonTitle size="xl" />
          <SkeletonText lines={2} lineHeight="h-4" className="max-w-lg" />
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <SkeletonButton size="lg" className="w-full sm:w-48" />
            <SkeletonButton size="lg" className="w-full sm:w-56" />
          </div>
        </div>

        {/* Right Column Visual / Card */}
        <div className="lg:col-span-5 hidden lg:block">
          <div className="bg-[#060d19]/90 border border-slate-800 rounded-3xl p-8 space-y-6">
            <Skeleton className="w-full h-48 rounded-2xl" />
            <SkeletonText lines={3} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSkeleton;
