'use client';

import React from 'react';
import Skeleton from './Skeleton';

export interface SkeletonTitleProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const SkeletonTitle: React.FC<SkeletonTitleProps> = ({
  className = '',
  size = 'lg',
}) => {
  const sizeClasses = {
    sm: 'h-5 w-1/3',
    md: 'h-7 w-1/2',
    lg: 'h-9 w-2/3',
    xl: 'h-12 w-3/4 sm:w-2/3',
  }[size];

  return <Skeleton className={`${sizeClasses} ${className}`} />;
};

export default SkeletonTitle;
