'use client';

import React from 'react';
import { siteConfig } from '@/config/site';
import BrandLogo from '../BrandLogo';
import TrustItem from './TrustItem';

export const FooterBrand: React.FC = () => {
  const { footer } = siteConfig;

  return (
    <div className="space-y-6 flex flex-col justify-between text-left">
      <div className="space-y-3.5">
        {/* Official Complete Brand Logo */}
        <BrandLogo size="lg" />

        {/* Short Description */}
        <p className="text-slate-300 text-sm leading-relaxed font-normal max-w-xs whitespace-pre-line">
          {footer.description}
        </p>
      </div>

      {/* Vertical Trust Indicators Stack */}
      <div className="pt-2 flex flex-col space-y-4">
        {footer.trustIndicators.map((indicator) => (
          <TrustItem key={indicator.id} item={indicator} />
        ))}
      </div>
    </div>
  );
};

export default FooterBrand;
