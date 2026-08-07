'use client';

import React from 'react';

export default function AboutHero() {
  return (
    <section aria-labelledby="about-heading" className="relative w-full overflow-hidden bg-[#060a12] pt-12 pb-24 sm:pt-16 sm:pb-28 lg:pt-20 lg:pb-36">
      {/* FULL-BLEED HERO BACKGROUND IMAGE */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <img
          src="/about-hero-technician.png"
          alt=""
          className="w-full h-full object-cover object-right md:object-[85%_center] lg:object-right"
        />
        {/* Left-to-Right Dark Fade Gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#060a12] via-[#060a12]/95 via-45% to-transparent w-full lg:w-[70%]" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#060a12] via-[#060a12]/70 to-transparent hidden md:block" />

        {/* Top and Bottom Gradient Blends */}
        <div className="absolute top-0 inset-x-0 h-20 bg-gradient-to-b from-[#060a12] to-transparent" />
        <div className="absolute bottom-0 inset-x-0 h-36 bg-gradient-to-t from-[#060a12] via-[#060a12]/80 to-transparent" />
      </div>

      {/* HERO CONTENT */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl lg:max-w-xl space-y-6">
          {/* EYEBROW */}
          <div className="space-y-1.5">
            <span className="text-emerald-400 font-bold text-xs sm:text-sm tracking-widest uppercase">
              OUR MISSION
            </span>
            <div className="w-10 h-0.5 bg-emerald-400 rounded-full" />
          </div>

          {/* MAIN HEADING */}
          <h1
            id="about-heading"
            className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.1]"
          >
            About <span className="text-emerald-400">All Care Mint</span>
          </h1>

          {/* DESCRIPTION */}
          <p className="text-slate-200 text-base sm:text-lg leading-relaxed max-w-lg font-normal">
            All Care Mint is an on-demand home services marketplace platform connecting homeowners and residents with vetted, verified local service professionals.
          </p>

          {/* TRUST INDICATORS */}
          <div className="pt-3 flex flex-wrap items-center gap-6 sm:gap-8">
            {/* 1. Verified Professionals */}
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-full border border-emerald-500/40 bg-[#06141b]/80 text-emerald-400 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(16,185,129,0.2)] backdrop-blur-md">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <div className="text-left">
                <div className="text-sm font-bold text-white leading-tight">Verified</div>
                <div className="text-xs text-slate-300 leading-tight">Professionals</div>
              </div>
            </div>

            {/* 2. Upfront Pricing */}
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-full border border-emerald-500/40 bg-[#06141b]/80 text-emerald-400 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(16,185,129,0.2)] backdrop-blur-md">
                <span className="text-base font-bold text-emerald-400" aria-hidden="true">₹</span>
              </div>
              <div className="text-left">
                <div className="text-sm font-bold text-white leading-tight">Upfront</div>
                <div className="text-xs text-slate-300 leading-tight">Pricing</div>
              </div>
            </div>

            {/* 3. On-Time Service */}
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-full border border-emerald-500/40 bg-[#06141b]/80 text-emerald-400 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(16,185,129,0.2)] backdrop-blur-md">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="text-left">
                <div className="text-sm font-bold text-white leading-tight">On-Time</div>
                <div className="text-xs text-slate-300 leading-tight">Service</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
