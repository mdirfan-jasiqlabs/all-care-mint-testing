'use client';

import React from 'react';
import { siteConfig } from '@/config/site';
import FooterBrand from './footer/FooterBrand';
import FooterNavColumn from './footer/FooterNavigation';
import FooterCTA from './footer/FooterCTA';
import FooterBottomBar from './footer/FooterBottomBar';

export function Footer() {
  const { exploreLinks, companyLinks } = siteConfig.footer;

  return (
    <footer className="w-full bg-[#050a12] text-slate-100 border-t border-slate-900/90 relative select-none">
      {/* Centered Max-Width Container (max-w-[1400px]) */}
      <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12 py-14 sm:py-16">
        
        {/* Responsive Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-10 xl:gap-8 items-start">
          
          {/* Column 1: Brand & Vertical Trust Indicators (1.5fr equivalent) */}
          <div className="xl:col-span-4 xl:pr-8">
            <FooterBrand />
          </div>

          {/* Column 2: Explore Navigation (0.75fr equivalent) */}
          <div className="xl:col-span-2 xl:px-6 xl:border-l xl:border-white/[0.06]">
            <FooterNavColumn title="Explore" links={exploreLinks} ariaLabel="Explore Links" />
          </div>

          {/* Column 3: Company Navigation (0.85fr equivalent) */}
          <div className="xl:col-span-3 xl:px-6 xl:border-l xl:border-white/[0.06]">
            <FooterNavColumn title="Company" links={companyLinks} ariaLabel="Company Links" />
          </div>

          {/* Column 4: App Download CTA (1.2fr equivalent) */}
          <div className="xl:col-span-3 xl:pl-6 xl:border-l xl:border-white/[0.06]">
            <FooterCTA />
          </div>

        </div>

        {/* Bottom Bar: Copyright & Social Icons */}
        <FooterBottomBar />

      </div>
    </footer>
  );
}

export default Footer;
