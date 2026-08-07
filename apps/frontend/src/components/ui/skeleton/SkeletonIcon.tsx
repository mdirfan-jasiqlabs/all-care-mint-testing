'use client';

import React from 'react';
import Skeleton from './Skeleton';

export interface SkeletonIconProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'circular' | 'rounded';
}

export const SkeletonIcon: React.FC<SkeletonIconProps> = ({
  className = '',
  size = 'md',
  variant = 'rounded',
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  }[size];

  return <Skeleton variant={variant} className={`${sizeClasses} ${className}`} />;
};

export default SkeletonIcon;
