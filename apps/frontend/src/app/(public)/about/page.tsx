'use client';

import React from 'react';
import AboutHero from '@/components/about/AboutHero';
import PlatformValues from '@/components/about/PlatformValues';
import OurTeam from '@/components/about/OurTeam';

export default function AboutPage() {
  return (
    <main className="w-full flex-1 bg-[#060a12]">
      <AboutHero />
      <PlatformValues />
      <OurTeam />
    </main>
  );
}
