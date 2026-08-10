'use client';

import React from 'react';

interface ValueCardData {
  title: string;
  description: string;
  icon: React.ReactNode;
}

const valueCards: ValueCardData[] = [
  {
    title: 'Verified & Trusted',
    description: 'Multi-step verification, background checks, and certification to ensure trusted professionals.',
    icon: (
      <svg
        className="w-6 h-6 text-emerald-400"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
        />
      </svg>
    ),
  },
  {
    title: 'Smart & Real-Time Matching',
    description: 'Advanced technology matches you with the right professional near you in real time.',
    icon: (
      <svg
        className="w-6 h-6 text-emerald-400"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    title: 'Customer First',
    description: 'Transparent pricing, easy booking, secure payments, and dedicated support at every step.',
    icon: (
      <svg
        className="w-6 h-6 text-emerald-400"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </svg>
    ),
  },
];

export default function PlatformValues() {
  return (
    <section
      aria-labelledby="values-heading"
      className="relative z-20 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-2 sm:mt-4 pb-8"
    >
      <div className="bg-[#060d19]/95 border border-emerald-500/20 rounded-[28px] p-6 sm:p-10 lg:p-12 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-xl">
        {/* HEADER & COPY */}
        <div className="space-y-4 max-w-3xl mb-8 sm:mb-10">
          <h2 id="values-heading" className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Platform Values &amp; Quality Standards
          </h2>
          <div className="space-y-3 text-sm sm:text-base text-slate-300 leading-relaxed font-normal">
            <p>
              We believe home services should be reliable, transparent, and hassle-free. Every provider in our network undergoes multi-step identity verification, criminal background checks, and trade skill certifications before accepting bookings.
            </p>
            <p>
              Our automated matching engine pairs customer service requests with nearby available providers in real-time, eliminating phone calls and uncertainty.
            </p>
          </div>
        </div>

        {/* 3 VALUE CARDS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {valueCards.map((card, index) => (
            <div
              key={index}
              className="bg-[#040812]/90 border border-emerald-500/20 rounded-2xl p-6 sm:p-7 flex items-start space-x-4 hover:border-emerald-500/40 transition-all duration-300 hover:-translate-y-0.5"
            >
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                {card.icon}
              </div>
              <div className="space-y-1.5 flex-1">
                <h3 className="text-base font-bold text-white tracking-wide">{card.title}</h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-normal">
                  {card.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
