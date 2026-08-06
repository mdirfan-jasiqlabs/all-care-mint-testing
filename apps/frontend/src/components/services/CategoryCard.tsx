'use client';

import React from 'react';
import Link from 'next/link';
import IconWrapper from './IconWrapper';
import CTAButton from './CTAButton';

export interface CategoryData {
  id: string;
  name: string;
  description: string | null;
  iconUrl?: string | null;
  displayOrder?: number;
  isActive?: boolean;
}

export interface CategoryCardProps {
  category: CategoryData;
}

export const CategoryCard: React.FC<CategoryCardProps> = ({ category }) => {
  const targetUrl = `/catalog/services?categoryId=${category.id}&categoryName=${encodeURIComponent(category.name)}`;

  return (
    <Link
      href={targetUrl}
      className="block group h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 rounded-[22px]"
      aria-label={`Explore ${category.name} services`}
    >
      <article className="relative bg-gradient-to-b from-[#07131e]/95 via-[#050d18]/95 to-[#040810]/95 border border-emerald-500/30 hover:border-emerald-400/90 rounded-[22px] p-6 sm:p-7 flex flex-col justify-between h-full backdrop-blur-xl shadow-lg hover:shadow-[0_12px_35px_rgba(16,185,129,0.22)] transition-all duration-300 hover:-translate-y-1.5 overflow-hidden">
        
        {/* Decorative 5x4 Dot Grid Pattern in Top-Right Corner */}
        <div
          className="absolute top-5 right-5 grid grid-cols-5 gap-1.5 opacity-25 group-hover:opacity-50 transition-opacity duration-300 pointer-events-none"
          aria-hidden="true"
        >
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="w-1 h-1 rounded-full bg-emerald-400/80" />
          ))}
        </div>

        {/* Radial Ambient Glow inside top-left behind icon */}
        <div
          className="absolute -top-10 -left-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/20 transition-all duration-300"
          aria-hidden="true"
        />

        {/* Top Content: Icon, Title, Mint Bar, Description */}
        <div className="relative z-10 space-y-4">
          {/* Large Service Icon */}
          <IconWrapper name={category.name} iconUrl={category.iconUrl} />

          {/* Category Title & Mint Accent Bar */}
          <div>
            <h3 className="text-xl sm:text-xl font-bold text-white tracking-tight leading-snug">
              {category.name}
            </h3>
            
            {/* Mint Accent Line */}
            <div
              className="w-7 h-0.5 bg-emerald-400 rounded-full my-3 group-hover:w-12 transition-all duration-300"
              aria-hidden="true"
            />
          </div>

          {/* Category Description */}
          <p className="text-xs sm:text-sm text-slate-300/90 leading-relaxed font-normal">
            {category.description || `Professional ${category.name.toLowerCase()} services available on All-Care MINT.`}
          </p>
        </div>

        {/* Bottom CTA Pill Button */}
        <div className="relative z-10 pt-6 mt-2">
          <CTAButton label="Explore Services" />
        </div>
      </article>
    </Link>
  );
};

export default CategoryCard;
