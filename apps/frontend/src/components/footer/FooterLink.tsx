'use client';

import React from 'react';
import Link from 'next/link';
import { NavItem } from '@/config/site';

export interface FooterLinkProps {
  item: NavItem;
}

export const FooterLink: React.FC<FooterLinkProps> = ({ item }) => {
  return (
    <Link
      href={item.href}
      className="group flex items-center justify-between text-xs sm:text-sm text-slate-300 hover:text-emerald-400 font-medium py-1 transition-colors duration-200 cursor-pointer"
    >
      <span>{item.label}</span>
      <svg
        className="w-3.5 h-3.5 text-emerald-400/70 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all duration-200"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
};

export default FooterLink;
