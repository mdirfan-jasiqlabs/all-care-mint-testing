'use client';

import React from 'react';
import Link from 'next/link';

export default function BookServiceCTA() {
  const trustFeatures = [
    {
      title: 'Verified Professionals',
      description: 'Background-checked & trusted experts',
      icon: (
        <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    },
    {
      title: 'Upfront Pricing',
      description: 'No surprises. What you see is what you pay.',
      icon: (
        <span className="w-5 h-5 flex items-center justify-center font-bold text-emerald-400 text-base">
          ₹
        </span>
      ),
    },
    {
      title: 'Secure Payments',
      description: '100% secure payments in-app or COD',
      icon: (
        <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
    },
    {
      title: 'Customer Support',
      description: "We're here to help you, always.",
      icon: (
        <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
  ];

  return (
    <section 
      aria-label="Book a Service CTA"
      className="relative pb-10 sm:pb-12 pt-2 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6"
    >
      {/* Main Horizontal CTA Card Container */}
      <div className="relative bg-dark-surface border border-emerald-500/30 rounded-3xl p-6 sm:p-10 lg:p-12 shadow-cta-card-glow overflow-hidden space-y-10">
        {/* Subtle background ambient glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        {/* Top CTA Row */}
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left">
          
          {/* Left Area: Glowing Calendar/Service Icon */}
          <div className="flex-shrink-0">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-icon-glow relative">
              <svg className="w-10 h-10 sm:w-12 sm:h-12" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {/* Checkmark badge overlay */}
              <span className="absolute -bottom-1 -right-1 bg-emerald-400 text-slate-950 rounded-full p-1 border-2 border-dark-surface">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </span>
            </div>
          </div>

          {/* Center Area: Eyebrow, Heading, Description */}
          <div className="flex-1 space-y-2.5 max-w-2xl">
            <span className="text-emerald-400 text-xs sm:text-sm font-bold tracking-wide">
              Ready to get started?
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
              Book a Service Now
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
              Instant booking. Upfront pricing.<br className="hidden sm:inline" /> Verified professionals. Your time, your way.
            </p>
          </div>

          {/* Right Area: CTA Button & Timer helper */}
          <div className="flex flex-col items-center flex-shrink-0 space-y-2.5">
            <Link
              href="/services"
              className="inline-flex items-center justify-center space-x-2 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black px-6 sm:px-7 py-3.5 rounded-xl text-sm sm:text-base transition-all shadow-btn-mint-glow hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>Book a Service</span>
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-slate-950" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>

            <div className="flex items-center justify-center space-x-1.5 text-slate-400 text-xs font-medium w-full text-center">
              <svg className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Takes less than 2 minutes</span>
            </div>
          </div>

        </div>

        {/* Integrated Bottom Trust Indicator Bar (Nested inside CTA card container) */}
        <div className="relative z-10 pt-8 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {trustFeatures.map((feature, idx) => (
            <div key={idx} className="flex items-start space-x-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                {feature.icon}
              </div>
              <div className="space-y-0.5 text-left">
                <h3 className="text-xs sm:text-sm font-bold text-white tracking-wide">
                  {feature.title}
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-400 leading-snug">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
