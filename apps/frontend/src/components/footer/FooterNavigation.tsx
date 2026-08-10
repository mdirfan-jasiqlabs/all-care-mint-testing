'use client';

import React from 'react';
import { NavItem } from '@/config/site';
import FooterLink from './FooterLink';

export interface FooterNavColumnProps {
  title: string;
  links: NavItem[];
  ariaLabel?: string;
}

export const FooterNavColumn: React.FC<FooterNavColumnProps> = ({ title, links, ariaLabel }) => {
  return (
    <div className="space-y-3.5 text-left w-full">
      <div>
        <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
          {title}
        </h3>
        {/* Small Mint Accent Underline Bar */}
        <div className="w-6 h-[2.5px] bg-emerald-400 rounded-full mt-1.5" />
      </div>

      <nav aria-label={ariaLabel || title}>
        <ul className="space-y-1.5 pt-1">
          {links.map((link) => (
            <li key={link.href + link.label}>
              <FooterLink item={link} />
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
};

export default FooterNavColumn;
