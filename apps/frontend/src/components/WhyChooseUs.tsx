'use client';

import React from 'react';

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  bottomBadgeIcon: React.ReactNode;
  bottomBadgeText: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({
  icon,
  title,
  description,
  bottomBadgeIcon,
  bottomBadgeText,
}) => {
  return (
    <div className="group relative bg-[#060d19]/90 border border-emerald-500/30 hover:border-emerald-400 rounded-[22px] p-6 sm:p-7 flex flex-col justify-between backdrop-blur-xl shadow-lg hover:shadow-[0_10px_30px_rgba(16,185,129,0.18)] transition-all duration-300 hover:-translate-y-1 overflow-hidden">
      
      {/* Decorative dot grid pattern in top-right corner */}
      <div className="absolute top-5 right-5 grid grid-cols-6 gap-1.5 opacity-25 group-hover:opacity-45 transition-opacity duration-300 pointer-events-none" aria-hidden="true">
        {Array.from({ length: 24 }).map((_, i) => (
          <div key={i} className="w-1 h-1 rounded-full bg-emerald-400" />
        ))}
      </div>

      <div className="relative z-10 space-y-4">
        {/* Large icon container */}
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center transition-all duration-300 group-hover:scale-105 group-hover:border-emerald-400 group-hover:shadow-[0_0_20px_rgba(16,185,129,0.25)]">
          {icon}
        </div>

        {/* Title */}
        <div>
          <h3 className="text-sm sm:text-base font-extrabold text-white tracking-wide uppercase">
            {title}
          </h3>
          {/* Mint accent divider bar */}
          <div className="w-7 h-0.5 bg-emerald-400 rounded-full my-3 group-hover:w-11 transition-all duration-300" />
        </div>

        {/* Description (High WCAG AA Contrast) */}
        <p className="text-xs sm:text-[13px] text-slate-200 leading-relaxed font-normal">
          {description}
        </p>
      </div>

      {/* Bottom Badge Pill */}
      <div className="relative z-10 pt-6 mt-2">
        <div className="inline-flex items-center space-x-2 bg-[#04121a]/90 border border-emerald-500/30 px-3.5 py-1.5 rounded-full text-xs font-semibold text-emerald-400 backdrop-blur-md group-hover:border-emerald-400/60 transition-colors">
          <span className="w-4 h-4 flex items-center justify-center" aria-hidden="true">
            {bottomBadgeIcon}
          </span>
          <span className="tracking-tight">{bottomBadgeText}</span>
        </div>
      </div>
    </div>
  );
};

export default function WhyChooseUs() {
  const cards: FeatureCardProps[] = [
    {
      icon: (
        <svg className="w-7 h-7 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      title: '100% VERIFIED PARTNERS',
      description:
        'Every professional goes through rigorous background verification and certifications checks before joining the directory.',
      bottomBadgeIcon: (
        <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      bottomBadgeText: 'Verified • Trusted • Reliable',
    },
    {
      icon: (
        <svg className="w-7 h-7 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: 'FIXED PRICING MODEL',
      description:
        'No hidden charges or surprise fees. See clear pricing lists directly in-app before booking service slots.',
      bottomBadgeIcon: (
        <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      ),
      bottomBadgeText: 'Transparent • Fair • Honest',
    },
    {
      icon: (
        <svg className="w-7 h-7 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      title: 'SWIFT LOCAL DISPATCH',
      description:
        'System algorithms locate nearby active professionals to assign booking jobs quickly.',
      bottomBadgeIcon: (
        <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      bottomBadgeText: 'Nearby • Fast • Efficient',
    },
  ];

  return (
    <section
      id="about"
      aria-labelledby="why-choose-heading"
      className="relative py-2 sm:py-4 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-5 sm:space-y-6"
    >
      {/* SECTION HEADER */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        {/* Top Glass Pill Badge */}
        <div className="inline-flex items-center space-x-2 bg-[#04141c]/95 border border-emerald-500/40 px-4 py-1.5 rounded-full backdrop-blur-md shadow-[0_0_18px_rgba(16,185,129,0.18)] text-emerald-400 text-xs font-bold uppercase tracking-wider">
          <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <span>WHY CHOOSE US</span>
        </div>

        {/* Main Heading */}
        <h2
          id="why-choose-heading"
          className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight tracking-tight max-w-4xl mx-auto"
        >
          Why Choose{' '}
          <span className="text-emerald-400 font-black">
            All care mint
          </span>
          ?
        </h2>

        {/* Supporting Subtitle Description */}
        <p className="text-slate-200 text-sm sm:text-base leading-relaxed max-w-xl mx-auto font-normal">
          We connect you with qualified service professionals safely and transparently.
        </p>
      </div>

      {/* FEATURE CARDS GRID (Responsive 1-col mobile, 3-col desktop) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
        {cards.map((card, index) => (
          <FeatureCard key={index} {...card} />
        ))}
      </div>
    </section>
  );
}
