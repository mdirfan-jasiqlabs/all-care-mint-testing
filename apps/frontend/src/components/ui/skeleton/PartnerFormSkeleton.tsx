'use client';

import React from 'react';
import Skeleton from './Skeleton';
import SkeletonButton from './SkeletonButton';

export const PartnerFormSkeleton: React.FC = () => {
  return (
    <div aria-hidden="true" className="bg-[#060d19]/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 w-full">
      <div className="space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      </div>

      <div className="space-y-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>

      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>

      <SkeletonButton size="lg" className="w-full" />
    </div>
  );
};

export default PartnerFormSkeleton;
