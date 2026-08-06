'use client';

import React from 'react';
import Link from 'next/link';
import { siteConfig } from '@/config/site';

export default function Footer() {
  return (
    <footer className="bg-slate-950 border-t border-slate-900 px-8 py-6 text-xs text-slate-500">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
        <span>{siteConfig.footer.copyright}</span>
        <div className="flex space-x-6">
          {siteConfig.footer.legalLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="hover:text-slate-400 cursor-pointer transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
