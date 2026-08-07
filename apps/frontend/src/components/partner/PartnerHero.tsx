'use client';

import React from 'react';
import PartnerApplicationForm from './PartnerApplicationForm';

export default function PartnerHero() {
  const compactBenefits = [
    {
      id: 'flexible',
      title: 'Flexible Hours',
      description: 'Work on your schedule and choose your availability.',
      icon: (
        <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
      ),
    },
    {
      id: 'local',
      title: 'Local Job Opportunities',
      description: 'Get matched with nearby customers in your area.',
      icon: (
        <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
        </svg>
      ),
    },
    {
      id: 'payouts',
      title: 'Reliable Payouts',
      description: 'Clear and transparent payment tracking.',
      icon: (
        <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 9.5a2.5 2.5 0 00-2.5-2.5H10a2.5 2.5 0 000 5h4a2.5 2.5 0 010 5h-3.5A2.5 2.5 0 018 14.5M12 6v12" />
        </svg>
      ),
    },
  ];

  return (
    <section aria-labelledby="partner-heading" className="relative py-8 sm:py-12 lg:py-16 overflow-hidden">
      
      {/* Subtle Background Glows */}
      <div className="absolute top-1/4 left-10 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Left Column: Hero Content & Technician Integration */}
          <div className="lg:col-span-7 space-y-6 relative">
            
            {/* Eyebrow Pill */}
            <div className="inline-flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/25 px-3.5 py-1.5 rounded-full text-emerald-400 text-xs font-bold uppercase tracking-wider shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>PARTNER WITH ALL CARE MINT</span>
            </div>

            {/* H1 Heading */}
            <h1 id="partner-heading" className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-[1.15]">
              Become an <br />
              <span className="text-emerald-400 font-extrabold drop-shadow-[0_0_25px_rgba(16,185,129,0.3)]">
                All Care Mint Partner
              </span>
            </h1>

            {/* Description */}
            <p className="text-slate-300 text-xs sm:text-sm lg:text-base leading-relaxed max-w-xl font-medium">
              Set your own schedule, get matched with local customers, and grow your service business with a trusted home services platform.
            </p>

            {/* Split layout on desktop: Left compact benefits + Right technician photo */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 pt-2 items-center">
              
              {/* 3 Compact Benefit Rows */}
              <div className="sm:col-span-7 space-y-4 z-10">
                {compactBenefits.map((benefit) => (
                  <div key={benefit.id} className="flex items-start space-x-3 group">
                    <div className="w-9 h-9 rounded-xl bg-slate-900/90 border border-emerald-500/30 group-hover:border-emerald-400 text-emerald-400 flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-105 shadow-md">
                      {benefit.icon}
                    </div>
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-white tracking-tight">
                        {benefit.title}
                      </h3>
                      <p className="text-[11px] sm:text-xs text-slate-400 font-medium leading-normal">
                        {benefit.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Technician Image Visual */}
              <div className="sm:col-span-5 relative mt-4 sm:mt-0 flex justify-center sm:justify-end">
                <div className="relative w-56 sm:w-64 lg:w-72 rounded-2xl overflow-hidden border border-slate-800/80 shadow-2xl bg-gradient-to-b from-slate-900/60 to-[#060a12]/90 group">
                  {/* Subtle Top & Bottom Gradient Blends */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#060a12] via-transparent to-transparent z-10 opacity-70" />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#060a12]/40 via-transparent to-[#060a12]/40 z-10" />

                  <img
                    src="/partner-technician.png"
                    alt="All Care Mint Professional Service Technician holding digital tablet"
                    className="w-full h-auto object-cover object-top transition-transform duration-500 group-hover:scale-105"
                  />

                  {/* Trust Badge overlay at bottom of technician photo */}
                  <div className="absolute bottom-3 left-3 right-3 z-20 bg-slate-950/85 backdrop-blur-md border border-emerald-500/30 px-3 py-1.5 rounded-xl flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                      Verified Field Partner
                    </span>
                  </div>
                </div>
              </div>

            </div>

          </div>

          {/* Right Column: Application Form */}
          <div className="lg:col-span-5">
            <PartnerApplicationForm />
          </div>

        </div>
      </div>
    </section>
  );
}
