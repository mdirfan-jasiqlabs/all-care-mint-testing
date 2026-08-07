'use client';

import React from 'react';
import Skeleton from './Skeleton';
import SkeletonText from './SkeletonText';

export const ProcessStepsSkeleton: React.FC = () => {
  return (
    <div aria-hidden="true" className="w-full max-w-6xl mx-auto px-4 py-8 space-y-8">
      <div className="text-center space-y-3 max-w-xl mx-auto">
        <Skeleton className="h-5 w-32 mx-auto rounded-full" />
        <Skeleton className="h-8 w-64 mx-auto" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
        {[1, 2, 3].map((step) => (
          <div
            key={step}
            className="bg-[#060d19]/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4"
          >
            <div className="flex justify-between items-center">
              <Skeleton className="w-12 h-12 rounded-2xl" />
              <Skeleton className="w-10 h-10 rounded-full" />
            </div>
            <Skeleton className="h-6 w-3/4" />
            <SkeletonText lines={2} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProcessStepsSkeleton;
