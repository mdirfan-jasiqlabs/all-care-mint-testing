'use client';

import React from 'react';
import { siteConfig } from '@/config/site';
import FooterLink from './FooterLink';

export const FooterNavigation: React.FC = () => {
  const { quickLinks } = siteConfig.footer;

  return (
    <div className="space-y-3 text-left w-full max-w-[220px] mx-auto md:ml-auto">
      <div>
        <h4 className="text-sm font-bold text-white tracking-wide">
          Quick Links
        </h4>
        {/* Mint Accent Underline */}
        <div className="w-6 h-0.5 bg-emerald-400 rounded-full mt-1.5" />
      </div>

      <ul className="space-y-1 pt-1" aria-label="Quick Links">
        {quickLinks.map((link) => (
          <li key={link.href}>
            <FooterLink item={link} />
          </li>
        ))}
      </ul>
    </div>
  );
};

export default FooterNavigation;
