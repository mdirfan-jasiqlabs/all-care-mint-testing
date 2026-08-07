'use client';

import React from 'react';
import SkeletonCard from './SkeletonCard';

export interface CategoryGridSkeletonProps {
  count?: number;
}

export const CategoryGridSkeleton: React.FC<CategoryGridSkeletonProps> = ({ count = 4 }) => {
  return (
    <div
      aria-hidden="true"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 w-full"
    >
      {Array.from({ length: count }).map((_, idx) => (
        <SkeletonCard key={idx} />
      ))}
    </div>
  );
};

export default CategoryGridSkeleton;
