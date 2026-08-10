'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { siteConfig } from '@/config/site';

import BrandLogo from './BrandLogo';

export default function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isActiveRoute = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        isScrolled
          ? 'bg-[#060a12]/90 backdrop-blur-xl border-b border-emerald-500/20 shadow-2xl shadow-black/60'
          : 'bg-[#060a12]/95 backdrop-blur-md border-b border-slate-900/60 shadow-md'
      }`}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex justify-between items-center" aria-label="Main Navigation">
        
        {/* Official Brand Logo */}
        <BrandLogo size="md" priority={true} />

        {/* Desktop Main Navigation Links */}
        <div className="hidden lg:flex items-center space-x-8 text-xs xl:text-sm font-semibold">
          {siteConfig.mainNav.map((link) => {
            const active = isActiveRoute(link.href);
            return (
              <Link
                key={link.label}
                href={link.href}
                className={`transition-all duration-150 relative py-1.5 ${
                  active
                    ? 'text-emerald-400 font-bold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {link.label}
                {active && (
                  <span className="absolute bottom-0 left-0 w-full h-[2.5px] bg-emerald-400 rounded-full" />
                )}
              </Link>
            );
          })}
        </div>

        {/* Header Action Controls (Desktop) */}
        <div className="hidden md:flex items-center space-x-3 sm:space-x-4">
          {/* Primary CTA: Book a Service */}
          <Link
            href="/services"
            className="bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black px-4 sm:px-5 py-2.5 rounded-xl text-xs transition-all shadow-lg shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98]"
          >
            Book a Service
          </Link>

          {/* Secondary CTA: Admin Login */}
          <Link
            href="/admin/login"
            className="border border-slate-800 hover:border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-white font-bold px-3.5 py-2.5 rounded-xl text-xs transition-all"
          >
            Admin Login
          </Link>
        </div>

        {/* Mobile Hamburger Toggle Button */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden text-slate-300 hover:text-white p-2 rounded-xl bg-slate-900 border border-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          aria-expanded={mobileMenuOpen}
          aria-label="Toggle navigation menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
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
        <div className="lg:hidden bg-slate-950/98 border-b border-slate-900 px-5 py-4 space-y-4 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col space-y-2 font-semibold text-sm">
            {siteConfig.mainNav.map((link) => {
              const active = isActiveRoute(link.href);
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-3 py-2 rounded-lg transition-colors ${
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

          <div className="pt-3 border-t border-slate-900 flex flex-col space-y-2.5">
            <Link
              href="/services"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black py-2.5 rounded-xl text-xs shadow-md shadow-emerald-500/10"
            >
              Book a Service
            </Link>
            <Link
              href="/admin/login"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center border border-slate-800 bg-slate-900 text-slate-300 font-bold py-2 rounded-xl text-xs"
            >
              Admin Login
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
