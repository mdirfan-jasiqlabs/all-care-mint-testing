'use client';

import React from 'react';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  variant?: 'rectangular' | 'rounded' | 'circular';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'rounded',
  children,
  ...props
}) => {
  const variantStyles = {
    rectangular: 'rounded-none',
    rounded: 'rounded-xl',
    circular: 'rounded-full',
  }[variant];

  return (
    <div
      aria-hidden="true"
      className={`animate-skeleton-shimmer border border-slate-800/80 ${variantStyles} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export default Skeleton;
