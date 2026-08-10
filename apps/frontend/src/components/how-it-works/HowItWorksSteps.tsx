'use client';

import React from 'react';
import ProcessStepCard, { StepItem } from './ProcessStepCard';
import MotionStagger from '@/components/motion/MotionStagger';
import MotionCard from '@/components/motion/MotionCard';

export default function HowItWorksSteps() {
  const steps: StepItem[] = [
    {
      number: '01',
      title: 'Choose Your Service',
      description:
        'Browse available services, check upfront pricing, and select a convenient time slot.',
      icon: (
        <svg
          className="w-9 h-9 text-emerald-400"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M10 7v3m0 0v3m0-3h3m-3 0H7"
          />
        </svg>
      ),
    },
    {
      number: '02',
      title: 'We Match a Professional',
      description:
        'We connect your booking with an available verified service professional for your selected slot.',
      icon: (
        <div className="relative">
          <svg
            className="w-9 h-9 text-emerald-400"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
          <span className="absolute -bottom-1 -right-1 bg-emerald-500 text-dark-bg rounded-full p-0.5 border border-dark-elevated">
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </span>
        </div>
      ),
    },
    {
      number: '03',
      title: 'Get It Done',
      description:
        'The professional completes the service on time, and you pay securely online or choose Cash on Service.',
      icon: (
        <svg
          className="w-9 h-9 text-emerald-400"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
  ];

  return (
    <section 
      aria-labelledby="how-it-works-heading" 
      className="relative py-6 sm:py-8 lg:py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto"
    >
      {/* Section Header */}
      <div className="text-center space-y-3 max-w-2xl mx-auto mb-6 sm:mb-8">
        {/* Eyebrow badge */}
        <div className="inline-flex items-center space-x-2 text-emerald-400 text-xs font-bold uppercase tracking-widest relative">
          <span className="w-6 h-[1.5px] bg-emerald-500/50 rounded-full" />
          <span>HOW IT WORKS</span>
          <span className="w-6 h-[1.5px] bg-emerald-500/50 rounded-full" />
        </div>

        {/* Heading H2 */}
        <h2
          id="how-it-works-heading"
          className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight"
        >
          Book in 3 Simple Steps
        </h2>

        {/* Subtitle */}
        <p className="text-slate-300 text-sm sm:text-base leading-relaxed font-normal max-w-xl mx-auto">
          From choosing a service to getting it done – we make it simple.
        </p>
      </div>

      {/* Steps Container */}
      <div className="relative">
        <MotionStagger className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10 xl:gap-12 relative z-10 list-none p-0 m-0">
          {steps.map((step, index) => (
            <li key={step.number} className="relative">
              <MotionCard>
                <ProcessStepCard step={step} />
              </MotionCard>

              {/* Desktop Horizontal Connectors between cards */}
              {index < steps.length - 1 && (
                <div 
                  className="hidden lg:flex items-center absolute top-1/2 -translate-y-1/2 left-full w-10 xl:w-12 z-20 pointer-events-none px-1 lg:px-1.5 xl:px-2"
                  aria-hidden="true"
                >
                  <div className="w-full flex items-center">
                    {/* Dotted Line */}
                    <div className="flex-1 border-t-2 border-dashed border-emerald-400/70" />
                    
                    {/* Seamlessly Attached Larger Arrowhead */}
                    <svg 
                      className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 -ml-[3px]" 
                      viewBox="0 0 12 12" 
                      fill="currentColor"
                    >
                      <path d="M1.5 2 L10 6 L1.5 10 Z" />
                    </svg>
                  </div>
                </div>
              )}

              {/* Mobile/Tablet Vertical Connector line between vertical cards */}
              {index < steps.length - 1 && (
                <div 
                  className="flex lg:hidden justify-center absolute left-1/2 -translate-x-1/2 -bottom-10 h-10 w-0.5 z-0 pointer-events-none"
                  aria-hidden="true"
                >
                  <div className="h-full border-r-2 border-dashed border-emerald-500/40" />
                </div>
              )}
            </li>
          ))}
        </MotionStagger>
      </div>
    </section>
  );
}

