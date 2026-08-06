'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { siteConfig } from '@/config/site';

export default function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActiveRoute = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-slate-950/90 border-b border-slate-900">
      <nav className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center" aria-label="Main Navigation">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center space-x-3 text-emerald-400 font-bold text-xl cursor-pointer">
          <img
            src={siteConfig.logo.src}
            alt={siteConfig.logo.alt}
            className="w-9 h-9 object-contain rounded-lg border border-emerald-500/20 shadow-sm"
          />
          <span className="tracking-tight text-white font-extrabold">
            {siteConfig.name} <span className="text-emerald-400 font-medium">{siteConfig.brandNameHighlight}</span>
          </span>
        </Link>

        {/* Desktop Main Navigation Links */}
        <div className="hidden md:flex items-center space-x-6 text-sm font-semibold">
          {siteConfig.mainNav.map((link) => {
            const active = isActiveRoute(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`transition-colors ${
                  active
                    ? 'text-emerald-400 font-bold border-b-2 border-emerald-400 pb-0.5'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Header Action Buttons (Desktop) */}
        <div className="hidden md:flex items-center space-x-3">
          {siteConfig.headerActions.map((btn) => {
            if (btn.variant === 'secondary') {
              return (
                <Link
                  key={btn.label}
                  href={btn.href}
                  className="border border-slate-700 hover:border-slate-500 bg-slate-900/60 hover:bg-slate-800 text-slate-200 hover:text-white font-bold px-4 py-2 rounded-lg text-xs transition-all"
                >
                  {btn.label}
                </Link>
              );
            }
            return (
              <a
                key={btn.label}
                href={btn.href}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold px-5 py-2 rounded-lg text-xs transition-all shadow-md shadow-emerald-500/10"
              >
                {btn.label}
              </a>
            );
          })}
        </div>

        {/* Mobile Hamburger Toggle Button */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden text-slate-300 hover:text-white p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          aria-expanded={mobileMenuOpen}
          aria-label="Toggle navigation menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            {mobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </nav>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-950 border-b border-slate-800 px-6 py-4 space-y-4">
          <div className="flex flex-col space-y-3 font-semibold text-sm">
            {siteConfig.mainNav.map((link) => {
              const active = isActiveRoute(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-3 py-2 rounded-md transition-colors ${
                    active
                      ? 'bg-emerald-500/10 text-emerald-400 font-bold border-l-2 border-emerald-400'
                      : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-900 flex flex-col space-y-2">
            {siteConfig.headerActions.map((btn) => {
              if (btn.variant === 'secondary') {
                return (
                  <Link
                    key={btn.label}
                    href={btn.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center border border-slate-700 bg-slate-900 text-slate-200 hover:text-white font-bold py-2 rounded-lg text-xs"
                  >
                    {btn.label}
                  </Link>
                );
              }
              return (
                <a
                  key={btn.label}
                  href={btn.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold py-2 rounded-lg text-xs"
                >
                  {btn.label}
                </a>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
}
