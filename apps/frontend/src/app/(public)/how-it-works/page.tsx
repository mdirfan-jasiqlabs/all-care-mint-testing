'use client';

import React from 'react';
import Link from 'next/link';

export default function HowItWorksPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-6 sm:py-8 space-y-6 flex-1 w-full">
        <div className="space-y-4 text-center">
          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs px-4 py-1.5 rounded-full uppercase tracking-wider font-bold">
            PG-WEB-004 • Explainer Guide
          </span>
          <h1 className="text-3xl md:text-5xl font-black text-white">How All Care Mint Works</h1>
          <p className="text-slate-400 text-sm md:text-base max-w-xl mx-auto">
            Book verified home services in three seamless steps through our Customer Mobile App.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-slate-900/30 border border-slate-900 p-6 rounded-2xl flex flex-col items-center text-center space-y-4">
            <div className="w-12 h-12 bg-emerald-500 text-slate-950 font-black text-lg rounded-full flex items-center justify-center">1</div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Select Service</h3>
            <p className="text-xs text-slate-400 leading-relaxed">Choose from cleaning, plumbing, electrical, or appliance maintenance at fixed upfront pricing.</p>
          </div>

          <div className="bg-slate-900/30 border border-slate-900 p-6 rounded-2xl flex flex-col items-center text-center space-y-4">
            <div className="w-12 h-12 bg-emerald-500 text-slate-950 font-black text-lg rounded-full flex items-center justify-center">2</div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Provider Matched</h3>
            <p className="text-xs text-slate-400 leading-relaxed">Our dispatch algorithm assigns the nearest verified service professional to your slot automatically.</p>
          </div>

          <div className="bg-slate-900/30 border border-slate-900 p-6 rounded-2xl flex flex-col items-center text-center space-y-4">
            <div className="w-12 h-12 bg-emerald-500 text-slate-950 font-black text-lg rounded-full flex items-center justify-center">3</div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Get It Done</h3>
            <p className="text-xs text-slate-400 leading-relaxed">The expert completes your service on-time, and you pay securely in-app or via Cash on Service.</p>
          </div>
        </div>
      </div>
  );
}
