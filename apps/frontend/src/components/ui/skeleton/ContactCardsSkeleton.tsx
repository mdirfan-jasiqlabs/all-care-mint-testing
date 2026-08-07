'use client';

import React from 'react';
import Skeleton from './Skeleton';
import SkeletonText from './SkeletonText';

export const ContactCardsSkeleton: React.FC = () => {
  return (
    <div aria-hidden="true" className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 w-full max-w-6xl mx-auto">
      {[1, 2, 3].map((card) => (
        <div
          key={card}
          className="bg-[#060d19]/90 border border-emerald-500/20 p-8 rounded-3xl flex flex-col items-center text-center justify-between space-y-6"
        >
          <Skeleton variant="circular" className="w-14 h-14 rounded-full" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-6 w-44" />
          <SkeletonText lines={1} className="w-full" />
        </div>
      ))}
    </div>
  );
};

export default ContactCardsSkeleton;
