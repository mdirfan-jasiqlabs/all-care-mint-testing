'use client';

import React from 'react';
import FooterBrand from './footer/FooterBrand';
import FooterCTA from './footer/FooterCTA';
import FooterNavigation from './footer/FooterNavigation';
import FooterBottomBar from './footer/FooterBottomBar';

export function Footer() {
  return (
    <footer className="w-full bg-[#040914] text-slate-100 border-t border-slate-800/80 relative select-none overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* FULL WIDTH CONTAINER WITH INNER MAX-W-7X1 CONTENT */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 relative">
        
        {/* Decorative 5x5 Dot Matrix Pattern in Corners */}
        <div className="hidden sm:grid absolute top-8 left-8 grid-cols-5 gap-1.5 opacity-15 pointer-events-none" aria-hidden="true">
          {Array.from({ length: 25 }).map((_, i) => (
            <div key={i} className="w-1 h-1 rounded-full bg-emerald-400" />
          ))}
        </div>

        <div className="hidden sm:grid absolute top-8 right-8 grid-cols-5 gap-1.5 opacity-15 pointer-events-none" aria-hidden="true">
          {Array.from({ length: 25 }).map((_, i) => (
            <div key={i} className="w-1 h-1 rounded-full bg-emerald-400" />
          ))}
        </div>

        {/* MAIN RESPONSIVE 3-COLUMN GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8 items-start lg:divide-x lg:divide-slate-800/60">
          
          {/* Column 1: Brand & Trust Indicators */}
          <div className="lg:col-span-5 lg:pr-8 space-y-6">
            <FooterBrand />
          </div>

          {/* Column 2: Mobile App CTA */}
          <div className="lg:col-span-4 lg:px-8 py-4 lg:py-0 border-t border-b lg:border-t-0 lg:border-b-0 border-slate-800/60">
            <FooterCTA />
          </div>

          {/* Column 3: Quick Links Navigation */}
          <div className="lg:col-span-3 lg:pl-8">
            <FooterNavigation />
          </div>

        </div>

        {/* BOTTOM BAR: Copyright, Brand Statement & Legal Links */}
        <FooterBottomBar />

      </div>
    </footer>
  );
}

export default Footer;
