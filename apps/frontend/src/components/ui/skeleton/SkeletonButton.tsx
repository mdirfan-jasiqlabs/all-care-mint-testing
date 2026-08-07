'use client';

import React from 'react';
import Skeleton from './Skeleton';

export interface SkeletonButtonProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const SkeletonButton: React.FC<SkeletonButtonProps> = ({
  className = '',
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'h-8 w-24 rounded-lg',
    md: 'h-11 w-36 rounded-xl',
    lg: 'h-12 w-48 rounded-xl',
  }[size];

  return <Skeleton className={`${sizeClasses} ${className}`} />;
};

export default SkeletonButton;
