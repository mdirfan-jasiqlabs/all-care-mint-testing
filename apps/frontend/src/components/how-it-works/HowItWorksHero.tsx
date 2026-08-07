'use client';

import React from 'react';

export default function HowItWorksHero() {
  return (
    <section 
      aria-label="Hero" 
      className="relative w-full min-h-[330px] sm:min-h-[370px] lg:min-h-[420px] xl:min-h-[460px] flex items-center overflow-hidden bg-dark-bg"
    >
      {/* Background Image Container with Object Position matching new AC Service Hero reference photo */}
      <div className="absolute inset-0 z-0">
        <img
          src="/how-it-works-ac-service-hero.webp"
          alt="Professional technician servicing a wall-mounted split air conditioner"
          className="w-full h-full object-cover object-[75%_32%] sm:object-[80%_32%] md:object-[82%_35%] xl:object-[85%_35%]"
        />
        {/* Controlled Soft Gradient Overlay for Text Readability & Natural Bright Lighting */}
        <div className="absolute inset-0 bg-gradient-to-r from-dark-bg/95 via-dark-bg/65 to-transparent w-full md:w-[65%] lg:w-[55%] xl:w-[50%]" />
        {/* Smooth Bottom Blend into the dark section background */}
        <div className="absolute inset-0 bg-gradient-to-t from-dark-bg via-dark-bg/30 to-transparent" />
      </div>

      {/* Content Container */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-12 w-full">
        <div className="max-w-2xl space-y-4 sm:space-y-6">
          {/* Eyebrow Badge */}
          <div className="inline-flex items-center space-x-2 text-emerald-400 text-xs font-bold uppercase tracking-widest">
            <span className="w-6 h-[1.5px] bg-emerald-500/50 rounded-full" />
            <span>HOW IT WORKS</span>
          </div>

          {/* Main Heading (Only H1 on the page) */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white leading-[1.15] tracking-tight">
            Trusted Home Services,<br />
            <span className="text-emerald-400 font-black">Just a Tap</span> Away.
          </h1>

          {/* Supporting Copy */}
          <p className="text-slate-200 text-sm sm:text-base lg:text-lg leading-relaxed max-w-xl font-normal">
            Professional care for your home, on your time.<br className="hidden sm:inline" />
            Simple booking. Verified experts. Peace of mind.
          </p>
        </div>
      </div>
    </section>
  );
}
