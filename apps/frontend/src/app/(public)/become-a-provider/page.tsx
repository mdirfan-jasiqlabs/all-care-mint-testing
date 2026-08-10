'use client';

import React from 'react';
import PartnerHero from '@/components/partner/PartnerHero';
import PartnerBenefitsSection from '@/components/partner/PartnerBenefitsSection';
import PartnerOnboardingSection from '@/components/partner/PartnerOnboardingSection';

export default function BecomeAProviderPage() {
  return (
    <main className="w-full flex-1 bg-[#060a12] text-slate-100 font-sans space-y-2 sm:space-y-4 pb-6">
      {/* Section 1: Hero + Partner Application Form */}
      <PartnerHero />

      {/* Section 2: Why Partner With Us */}
      <PartnerBenefitsSection />

      {/* Section 3: Partner Onboarding Process */}
      <PartnerOnboardingSection />
    </main>
  );
}
