'use client';

import React from 'react';
import CategoryIcon from './CategoryIcon';

export interface IconWrapperProps {
  name: string;
  iconUrl?: string | null;
}

export const IconWrapper: React.FC<IconWrapperProps> = ({ name, iconUrl }) => {
  return (
    <div
      className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center transition-all duration-300 group-hover:scale-105 group-hover:border-emerald-400 group-hover:bg-emerald-500/15 group-hover:shadow-[0_0_20px_rgba(16,185,129,0.25)] flex-shrink-0"
      aria-hidden="true"
    >
      <CategoryIcon name={name} iconUrl={iconUrl} className="w-7 h-7 text-emerald-400" />
    </div>
  );
};

export default IconWrapper;
