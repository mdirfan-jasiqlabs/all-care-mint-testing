'use client';

import React from 'react';
import HowItWorksHero from '@/components/how-it-works/HowItWorksHero';
import HowItWorksSteps from '@/components/how-it-works/HowItWorksSteps';
import BookServiceCTA from '@/components/how-it-works/BookServiceCTA';

export default function HowItWorksPage() {
  return (
    <main className="w-full flex-1 bg-dark-bg text-slate-100 selection:bg-emerald-500 selection:text-slate-950">
      {/* SECTION 1 — HERO */}
      <HowItWorksHero />

      {/* SECTION 2 — HOW IT WORKS / STEPS */}
      <HowItWorksSteps />

      {/* SECTION 3 — BOOK A SERVICE CTA */}
      <BookServiceCTA />
    </main>
  );
}
