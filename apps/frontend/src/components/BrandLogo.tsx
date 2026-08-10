'use client';

import React from 'react';
import Link from 'next/link';

export interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  priority?: boolean;
  href?: string | null;
  alt?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  className = '',
  priority = false,
  href = '/',
  alt = 'All care mint',
}) => {
  // Controlled visual heights preserving exact 3:1 aspect ratio:
  // sm: mobile navbar (~36px - 40px)
  // md: desktop navbar (~44px - 48px)
  // lg: footer / auth headers (~56px - 64px)
  const heightClasses = {
    sm: 'h-9 sm:h-10',
    md: 'h-11 sm:h-12',
    lg: 'h-14 sm:h-16',
  };

  const logoImage = (
    <img
      src="/logo.webp"
      alt={alt}
      className={`w-auto object-contain transition-all duration-200 group-hover:opacity-95 ${heightClasses[size]} ${className}`}
      loading={priority ? 'eager' : 'lazy'}
      style={{ aspectRatio: '918 / 306' }}
    />
  );

  if (href) {
    return (
      <Link
        href={href}
        className="inline-flex items-center focus:outline-none focus:ring-2 focus:ring-emerald-500/50 rounded-lg group"
        aria-label={`${alt} home`}
      >
        {logoImage}
      </Link>
    );
  }

  return logoImage;
};

export default BrandLogo;
