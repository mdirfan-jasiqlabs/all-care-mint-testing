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
      className="group inline-flex items-center space-x-2 text-xs sm:text-sm text-slate-300 hover:text-emerald-400 font-medium py-1 transition-colors duration-200 cursor-pointer focus:outline-none focus:text-emerald-400"
    >
      <svg
        className="w-3 h-3 text-emerald-400 flex-shrink-0 group-hover:translate-x-1 transition-transform duration-200"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
      <span className="group-hover:translate-x-0.5 transition-transform duration-200 whitespace-nowrap">
        {item.label}
      </span>
    </Link>
  );
};

export default FooterLink;
