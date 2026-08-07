'use client';

import React from 'react';

export interface StepItem {
  number: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

interface ProcessStepCardProps {
  step: StepItem;
}

export default function ProcessStepCard({ step }: ProcessStepCardProps) {
  return (
    <div className="relative group bg-dark-surface/90 border border-slate-800/90 hover:border-emerald-500/50 rounded-2xl p-7 pt-10 flex flex-col items-center text-center transition-all duration-300 hover:-translate-y-1 shadow-lg hover:shadow-mint-glow">
      {/* Floating Circular Step Number Badge */}
      <div 
        className="absolute -top-5 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-dark-bg border border-emerald-500/40 text-emerald-400 font-extrabold text-sm flex items-center justify-center shadow-badge-glow z-20 group-hover:border-emerald-400 group-hover:scale-105 transition-all"
        aria-label={`Step ${step.number}`}
      >
        {step.number}
      </div>

      {/* Centered Outlined Icon Container */}
      <div className="w-20 h-20 rounded-full bg-dark-elevated border border-slate-700/60 group-hover:border-emerald-500/40 text-emerald-400 flex items-center justify-center mb-6 shadow-inner transition-all group-hover:scale-105 group-hover:shadow-icon-glow">
        {step.icon}
      </div>

      {/* Card Title */}
      <h3 className="text-base sm:text-lg font-bold text-white mb-2.5 tracking-tight">
        {step.title}
      </h3>

      {/* Card Description */}
      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
        {step.description}
      </p>
    </div>
  );
}
