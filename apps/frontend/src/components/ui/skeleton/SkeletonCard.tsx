'use client';

import React from 'react';
import Skeleton from './Skeleton';
import SkeletonText from './SkeletonText';

export interface SkeletonCardProps {
  className?: string;
  hasIcon?: boolean;
  hasCta?: boolean;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({
  className = '',
  hasIcon = true,
  hasCta = true,
}) => {
  return (
    <div
      aria-hidden="true"
      className={`bg-[#060d19]/80 border border-emerald-500/20 rounded-[22px] p-6 sm:p-7 flex flex-col justify-between h-full space-y-6 relative overflow-hidden ${className}`}
    >
      <div className="space-y-4">
        {hasIcon && (
          <Skeleton variant="rounded" className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl" />
        )}
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="w-8 h-0.5 rounded-full" />
        <SkeletonText lines={2} lineHeight="h-3.5" />
      </div>

      {hasCta && (
        <div className="pt-2">
          <Skeleton variant="circular" className="w-32 h-9 rounded-full" />
        </div>
      )}
    </div>
  );
};

export default SkeletonCard;
