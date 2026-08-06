'use client';

import React from 'react';
import Link from 'next/link';
import { siteConfig } from '@/config/site';

export const FooterBottomBar: React.FC = () => {
  const { copyright, brandStatement, legalLinks } = siteConfig.footer;

  return (
    <div className="border-t border-slate-800/80 pt-6 mt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-400">
      {/* Left: Copyright */}
      <div className="text-center md:text-left">
        <span>
          © 2026 <strong className="text-emerald-400 font-bold">All-Care MINT</strong>. All rights reserved.
        </span>
      </div>

      {/* Center: Brand Statement with Heart Icon */}
      <div className="flex items-center space-x-2 text-slate-300 font-medium text-center">
        <svg className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.684a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
        <span>{brandStatement}</span>
      </div>

      {/* Right: Legal Links */}
      <div className="flex items-center space-x-4">
        {legalLinks.map((link, idx) => (
          <React.Fragment key={link.href}>
            {idx > 0 && <span className="text-slate-800" aria-hidden="true">|</span>}
            <Link
              href={link.href}
              className="hover:text-emerald-400 transition-colors cursor-pointer text-slate-400"
            >
              {link.label}
            </Link>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default FooterBottomBar;
