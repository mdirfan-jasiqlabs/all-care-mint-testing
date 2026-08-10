'use client';

import React from 'react';

export default function PartnerOnboardingSection() {
  const steps = [
    {
      stepNumber: '01',
      title: 'Apply Online',
      description: 'Fill out the application form with your basic details and service expertise.',
      icon: (
        <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
        </svg>
      ),
    },
    {
      stepNumber: '02',
      title: 'Verification',
      description: 'We review your information and required details before approval.',
      icon: (
        <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
      ),
    },
    {
      stepNumber: '03',
      title: 'Start Taking Jobs',
      description: 'Once approved, you can begin receiving available service opportunities.',
      icon: (
        <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
        </svg>
      ),
    },
  ];

  return (
    <section aria-labelledby="partner-onboarding-heading" className="py-4 sm:py-6 lg:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center space-y-3 mb-6 sm:mb-8">
          <span className="text-emerald-400 text-xs font-bold uppercase tracking-widest inline-block border-b border-emerald-500/30 pb-1">
            HOW PARTNER ONBOARDING WORKS
          </span>
          <h2 id="partner-onboarding-heading" className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
            Get Started in 3 Simple Steps
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm max-w-xl mx-auto font-medium">
            Our quick onboarding process helps you get ready to receive service opportunities.
          </p>
        </div>

        {/* Steps Container */}
        <div className="flex flex-col md:flex-row items-stretch justify-between gap-6 md:gap-4 relative">
          {steps.map((step, idx) => (
            <React.Fragment key={step.stepNumber}>
              
              {/* Step Card */}
              <div className="flex-1 bg-[#060a13]/90 border border-slate-900 hover:border-emerald-500/30 rounded-2xl p-6 sm:p-8 text-center shadow-xl backdrop-blur-md transition-all duration-300 hover:-translate-y-1 flex flex-col items-center justify-between group relative">
                
                {/* Step Number Badge pill */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-950 border border-emerald-500/40 text-emerald-400 font-extrabold text-[11px] px-3 py-0.5 rounded-full shadow-md">
                  {step.stepNumber}
                </div>

                {/* Circular Icon */}
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mt-2 mb-5 group-hover:scale-105 group-hover:border-emerald-400 transition-all duration-300 shadow-md">
                  {step.icon}
                </div>

                {/* Content */}
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white mb-2 tracking-tight">
                    {step.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-medium">
                    {step.description}
                  </p>
                </div>

              </div>

              {/* Desktop Horizontal Connector (Only between steps) */}
              {idx < steps.length - 1 && (
                <div className="hidden md:flex items-center justify-center w-12 xl:w-20 self-center" aria-hidden="true">
                  <div className="w-full h-[2px] bg-gradient-to-r from-emerald-500/30 via-emerald-400 to-emerald-500/30 relative flex items-center justify-end">
                    <svg className="w-4 h-4 text-emerald-400 -mr-1.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              )}

              {/* Mobile Vertical Connector (Only between steps) */}
              {idx < steps.length - 1 && (
                <div className="md:hidden flex justify-center py-2" aria-hidden="true">
                  <div className="w-[2px] h-8 bg-emerald-500/40 relative flex items-center justify-center">
                    <svg className="w-4 h-4 text-emerald-400 absolute -bottom-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              )}

            </React.Fragment>
          ))}
        </div>

      </div>
    </section>
  );
}
