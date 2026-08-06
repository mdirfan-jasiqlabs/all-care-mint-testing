'use client';

import React from 'react';

export interface GridContainerProps {
  children: React.ReactNode;
  className?: string;
}

export const GridContainer: React.FC<GridContainerProps> = ({ children, className = '' }) => {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch ${className}`}>
      {children}
    </div>
  );
};

export default GridContainer;
