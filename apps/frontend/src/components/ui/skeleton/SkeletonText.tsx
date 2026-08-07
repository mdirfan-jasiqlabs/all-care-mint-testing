'use client';

import React from 'react';
import Skeleton from './Skeleton';

export interface SkeletonTextProps {
  lines?: number;
  className?: string;
  lineHeight?: string;
}

export const SkeletonText: React.FC<SkeletonTextProps> = ({
  lines = 1,
  className = '',
  lineHeight = 'h-4',
}) => {
  return (
    <div className={`space-y-2.5 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, idx) => (
        <Skeleton
          key={idx}
          className={`${lineHeight} ${
            idx === lines - 1 && lines > 1 ? 'w-3/4' : 'w-full'
          }`}
        />
      ))}
    </div>
  );
};

export default SkeletonText;
