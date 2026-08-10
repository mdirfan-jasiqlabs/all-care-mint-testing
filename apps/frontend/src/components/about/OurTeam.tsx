'use client';

import React from 'react';
import Image from 'next/image';
import MotionStagger from '@/components/motion/MotionStagger';
import MotionCard from '@/components/motion/MotionCard';

interface TeamDepartment {
  code: string;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  altText: string;
  icon: React.ReactNode;
}

const TargetIcon = (
  <svg
    className="w-5 h-5 text-emerald-400"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="1.5" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v3m0 12v3M3 12h3m12 0h3" />
  </svg>
);

const CodeMonitorIcon = (
  <svg
    className="w-5 h-5 text-emerald-400"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <rect x="2" y="3" width="20" height="13" rx="2" ry="2" />
    <line x1="8" y1="20" x2="16" y2="20" />
    <line x1="12" y1="16" x2="12" y2="20" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 8.5L5.5 11 8 13.5m8-5l2.5 2.5L16 13.5m-3.5-6l-2 7" />
  </svg>
);

const HeadphonesIcon = (
  <svg
    className="w-5 h-5 text-emerald-400"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 18v-6a9 9 0 0118 0v6" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3v5zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3v5z" />
  </svg>
);

const departments: TeamDepartment[] = [
  {
    code: 'OS',
    title: 'Operations & Strategy',
    subtitle: 'Partner Onboarding & Quality',
    description: 'Oversees provider vetting, background checks, and service guarantee compliance.',
    image: '/images/team/operations-strategy.webp',
    altText: 'Service provider onboarding and quality verification',
    icon: TargetIcon,
  },
  {
    code: 'EP',
    title: 'Engineering & Product',
    subtitle: 'Platform Infrastructure',
    description: 'Builds real-time matching algorithms, mobile apps, and secure booking engines.',
    image: '/images/team/engineering-product.webp',
    altText: 'Engineering team working on the All care mint booking platform',
    icon: CodeMonitorIcon,
  },
  {
    code: 'CS',
    title: 'Customer Support',
    subtitle: 'Trust & Resident Advocacy',
    description: 'Ensures 24/7 resolution support for customers and service providers alike.',
    image: '/images/team/customer-support.webp',
    altText: 'Customer support specialist resolving a home service booking',
    icon: HeadphonesIcon,
  },
];

export default function OurTeam() {
  return (
    <section
      aria-labelledby="team-heading"
      className="relative z-20 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 lg:pb-12"
    >
      <div className="bg-[#060d19]/95 border border-emerald-500/20 rounded-[28px] p-6 sm:p-10 lg:p-12 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-xl">
        {/* SECTION HEADER */}
        <div className="space-y-2 max-w-3xl mb-8 sm:mb-10 lg:mb-12">
          <div>
            <span className="text-emerald-400 font-bold text-xs sm:text-sm tracking-widest uppercase block">
              LEADERSHIP &amp; OPERATIONS
            </span>
            <div className="w-10 h-0.5 bg-emerald-400 rounded-full mt-1.5 mb-3" aria-hidden="true" />
          </div>
          <h2 id="team-heading" className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
            Our Team
          </h2>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-normal pt-1">
            Our multidisciplinary team unites marketplace engineers, trust &amp; safety specialists, and local service experts dedicated to elevating home service standards.
          </p>
        </div>

        {/* 3 DEPARTMENT CARDS GRID */}
        <MotionStagger className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-7">
          {departments.map((dept) => (
            <MotionCard
              key={dept.code}
              className="bg-[#040812]/90 border border-emerald-500/20 rounded-2xl overflow-hidden flex flex-col justify-between hover:border-emerald-500/40 transition-all duration-300 shadow-[0_10px_30px_rgba(0,0,0,0.5)] group"
            >
              {/* CONTEXTUAL CARD IMAGE */}
              <div className="relative w-full aspect-[16/7.5] overflow-hidden bg-slate-950">
                <Image
                  src={dept.image}
                  alt={dept.altText}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 400px"
                  className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#040812] via-transparent to-transparent opacity-90" aria-hidden="true" />
              </div>

              {/* CARD CONTENT */}
              <div className="p-6 flex flex-col flex-1 justify-between space-y-4">
                {/* TOP METADATA ROW */}
                <div className="flex items-center justify-between">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 bg-[#08111e] border border-emerald-500/30 rounded-xl flex items-center justify-center text-emerald-400 font-bold text-base sm:text-lg shadow-[0_0_15px_rgba(16,185,129,0.1)] shrink-0">
                    {dept.code}
                  </div>
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full border border-emerald-500/30 bg-emerald-500/5 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.12)] shrink-0" aria-hidden="true">
                    {dept.icon}
                  </div>
                </div>

                {/* TYPOGRAPHY & DETAILS */}
                <div className="space-y-1.5 flex-1 pt-1">
                  <h3 className="text-base sm:text-lg font-bold text-white tracking-wide">{dept.title}</h3>
                  <p className="text-xs sm:text-sm text-emerald-400 font-medium">{dept.subtitle}</p>
                  <div className="w-9 h-[1.5px] bg-emerald-500/30 rounded-full my-3" aria-hidden="true" />
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                    {dept.description}
                  </p>
                </div>
              </div>
            </MotionCard>
          ))}
        </MotionStagger>
      </div>
    </section>
  );
}

