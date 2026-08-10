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
      {/* Centered Max-Width Container (max-w-[1320px]) */}
      <div className="max-w-[1320px] mx-auto w-full px-6 lg:px-8 pt-14 lg:pt-16 pb-6 lg:pb-7">
        
        {/* Tighter Responsive Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1.4fr_0.7fr_0.8fr_1.05fr] gap-y-10 md:gap-y-12 lg:gap-y-0 gap-x-8 md:gap-x-12 lg:gap-x-12 xl:gap-x-16 items-start">
          
          {/* Column 1: Brand & Vertical Trust Indicators */}
          <div className="order-1 md:order-1 lg:order-1">
            <FooterBrand />
          </div>

          {/* Column 2: Explore Navigation */}
          <div className="order-2 md:order-3 lg:order-2">
            <FooterNavColumn title="Explore" links={exploreLinks} ariaLabel="Explore Links" />
          </div>

          {/* Column 3: Company Navigation */}
          <div className="order-3 md:order-4 lg:order-3">
            <FooterNavColumn title="Company" links={companyLinks} ariaLabel="Company Links" />
          </div>

          {/* Column 4: App Download CTA */}
          <div className="order-4 md:order-2 lg:order-4">
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
