'use client';

import React from 'react';
import FooterBrand from './footer/FooterBrand';
import FooterCTA from './footer/FooterCTA';
import FooterNavigation from './footer/FooterNavigation';
import FooterBottomBar from './footer/FooterBottomBar';

export function Footer() {
  return (
    <footer className="w-full bg-[#060a12] text-slate-100 px-4 sm:px-6 lg:px-8 py-6 sm:py-8 select-none">
      {/* OUTER GLASS CONTAINER CARD */}
      <div className="max-w-7xl mx-auto relative bg-[#040914]/95 border border-emerald-500/30 hover:border-emerald-500/40 rounded-3xl p-6 sm:p-10 backdrop-blur-xl shadow-footer-glow transition-all duration-300 overflow-hidden">
        
        {/* Soft Radial Ambient Background Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none -z-10" />

        {/* Top-Left Decorative 5x5 Dot Matrix Pattern */}
        <div className="absolute top-5 left-5 grid grid-cols-5 gap-1.5 opacity-20 pointer-events-none" aria-hidden="true">
          {Array.from({ length: 25 }).map((_, i) => (
            <div key={i} className="w-1 h-1 rounded-full bg-emerald-400" />
          ))}
        </div>

        {/* Top-Right Decorative 5x5 Dot Matrix Pattern */}
        <div className="absolute top-5 right-5 grid grid-cols-5 gap-1.5 opacity-20 pointer-events-none" aria-hidden="true">
          {Array.from({ length: 25 }).map((_, i) => (
            <div key={i} className="w-1 h-1 rounded-full bg-emerald-400" />
          ))}
        </div>

        {/* MAIN 3-COLUMN LAYOUT */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-0 divide-y lg:divide-y-0 lg:divide-x divide-slate-800/60 items-stretch">
          
          {/* Left Column: Brand & Trust Badges */}
          <div className="lg:col-span-5 pb-6 lg:pb-0 lg:pr-8">
            <FooterBrand />
          </div>

          {/* Center Column: Primary Mobile App CTA */}
          <div className="lg:col-span-4 py-6 lg:py-0 lg:px-8">
            <FooterCTA />
          </div>

          {/* Right Column: Quick Links Navigation */}
          <div className="lg:col-span-3 pt-6 lg:pt-0 lg:pl-8">
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
