'use client';

import React from 'react';
import { siteConfig } from '@/config/site';
import BrandLogo from '../BrandLogo';
import TrustItem from './TrustItem';

export const FooterBrand: React.FC = () => {
  const { footer } = siteConfig;

  return (
    <div className="max-w-[370px] w-full text-left flex flex-col">
      <div>
        {/* Official Complete Brand Logo */}
        <BrandLogo size="lg" />

        {/* Short Description */}
        <p className="text-slate-300 text-sm leading-relaxed font-normal mt-6 max-w-[340px]">
          {footer.description}
        </p>
      </div>

      {/* Vertical Trust Indicators Stack */}
      <div className="mt-7 lg:mt-8 flex flex-col space-y-5.5">
        {footer.trustIndicators.map((indicator) => (
          <TrustItem key={indicator.id} item={indicator} />
        ))}
      </div>
    </div>
  );
};

export default FooterBrand;
