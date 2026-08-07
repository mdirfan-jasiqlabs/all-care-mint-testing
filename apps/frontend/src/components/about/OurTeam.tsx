'use client';

import React from 'react';

interface TeamDepartment {
  initials: string;
  title: string;
  subtitle: string;
  description: string;
}

const departments: TeamDepartment[] = [
  {
    initials: 'OS',
    title: 'Operations & Strategy',
    subtitle: 'Partner Onboarding & Quality',
    description: 'Oversees provider vetting, background checks, and service guarantee compliance.',
  },
  {
    initials: 'EP',
    title: 'Engineering & Product',
    subtitle: 'Platform Infrastructure',
    description: 'Builds real-time matching algorithms, mobile apps, and secure booking engines.',
  },
  {
    initials: 'CS',
    title: 'Customer Support',
    subtitle: 'Trust & Resident Advocacy',
    description: 'Ensures 24/7 resolution support for customers and service providers alike.',
  },
];

export default function OurTeam() {
  return (
    <section
      aria-labelledby="team-heading"
      className="relative z-20 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 lg:pb-24"
    >
      <div className="bg-[#060d19]/95 border border-emerald-500/20 rounded-[28px] p-6 sm:p-10 lg:p-12 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-xl">
        {/* SECTION HEADER */}
        <div className="space-y-3 max-w-3xl mb-8 sm:mb-10">
          <div className="space-y-1.5">
            <span className="text-emerald-400 font-bold text-xs sm:text-sm tracking-widest uppercase">
              LEADERSHIP &amp; OPERATIONS
            </span>
            <div className="w-10 h-0.5 bg-emerald-400 rounded-full" />
          </div>
          <h2 id="team-heading" className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Our Team
          </h2>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-normal">
            Our multidisciplinary team unites marketplace engineers, trust &amp; safety specialists, and local service experts dedicated to elevating home service standards.
          </p>
        </div>

        {/* 3 DEPARTMENT CARDS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {departments.map((dept, index) => (
            <div
              key={index}
              className="bg-[#040812]/90 border border-emerald-500/20 rounded-2xl p-6 sm:p-7 flex flex-col justify-between space-y-4 hover:border-emerald-500/40 transition-all duration-300 hover:-translate-y-0.5"
            >
              <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-center text-emerald-400 font-bold text-lg shadow-[0_0_15px_rgba(16,185,129,0.15)] shrink-0">
                {dept.initials}
              </div>

              <div className="space-y-2 flex-1">
                <div>
                  <h3 className="text-base font-bold text-white tracking-wide">{dept.title}</h3>
                  <p className="text-xs text-emerald-400 font-medium mt-0.5">{dept.subtitle}</p>
                </div>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-normal pt-1">
                  {dept.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
