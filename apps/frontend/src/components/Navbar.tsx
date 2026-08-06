'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { siteConfig } from '@/config/site';

export default function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(`${siteConfig.location.city}, ${siteConfig.location.state}`);
  const [isLocationMenuOpen, setIsLocationMenuOpen] = useState(false);

  const locations = [
    'Indore, MP',
    'Bhopal, MP',
    'Bengaluru, KA',
    'Mumbai, MH',
    'Delhi NCR',
    'Hyderabad, TS',
  ];

  const isActiveRoute = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <header className="sticky top-0 z-50 bg-[#060a12]/95 backdrop-blur-md border-b border-slate-900/60">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex justify-between items-center" aria-label="Main Navigation">
        
        {/* Brand Logo */}
        <Link href="/" className="flex items-center space-x-3 text-emerald-400 font-bold text-xl cursor-pointer group">
          <img
            src={siteConfig.logo.src}
            alt={siteConfig.logo.alt}
            className="w-8 h-8 sm:w-9 sm:h-9 object-contain rounded-lg border border-emerald-500/30 group-hover:border-emerald-400/60 transition-all shadow-sm"
          />
          <span className="tracking-tight text-white font-black text-lg sm:text-xl">
            {siteConfig.name}-<span className="text-emerald-400 font-extrabold">{siteConfig.brandNameHighlight}</span>
          </span>
        </Link>

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
          
          {/* Location Selector Pill */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsLocationMenuOpen(!isLocationMenuOpen)}
              className="flex items-center space-x-2 bg-slate-900/90 hover:bg-slate-900 border border-slate-800 text-slate-200 text-xs font-semibold px-3.5 py-2 rounded-xl transition-all"
              aria-expanded={isLocationMenuOpen}
              aria-label="Select location"
            >
              <svg className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>{selectedLocation}</span>
              <svg className={`w-3 h-3 text-slate-400 transition-transform ${isLocationMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Location Dropdown Menu */}
            {isLocationMenuOpen && (
              <div className="absolute right-0 mt-2 w-44 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-1.5 z-50 animate-fadeIn">
                <div className="px-3 py-1 text-[10px] uppercase font-bold tracking-wider text-slate-500 border-b border-slate-800">
                  Select City
                </div>
                {locations.map((loc) => (
                  <button
                    key={loc}
                    onClick={() => {
                      setSelectedLocation(loc);
                      setIsLocationMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs font-medium transition-colors hover:bg-slate-800 ${
                      selectedLocation === loc ? 'text-emerald-400 font-bold bg-emerald-500/10' : 'text-slate-300'
                    }`}
                  >
                    {loc}
                  </button>
                ))}
              </div>
            )}
          </div>

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
          <div className="pb-3 border-b border-slate-900 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Location:</span>
            <div className="flex items-center space-x-1.5 text-xs text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-lg">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
              <span>{selectedLocation}</span>
            </div>
          </div>

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
