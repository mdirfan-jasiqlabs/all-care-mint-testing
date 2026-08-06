'use client';

import React from 'react';
import Link from 'next/link';

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-16 space-y-12 flex-1 w-full">
        <div className="space-y-4 text-center">
          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs px-4 py-1.5 rounded-full uppercase tracking-wider font-bold">
            PG-WEB-002 • Our Mission
          </span>
          <h1 className="text-3xl md:text-5xl font-black text-white">About All Care Mint</h1>
          <p className="text-slate-400 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
            All Care Mint is an on-demand home services marketplace platform connecting homeowners and residents with vetted, verified local service professionals.
          </p>
        </div>

        <div className="bg-slate-900/30 border border-slate-900 p-8 rounded-3xl space-y-6">
          <h2 className="text-xl font-bold text-white">Platform Values & Quality Standards</h2>
          <div className="space-y-4 text-base text-slate-300 leading-relaxed">
            <p>
              We believe home services should be reliable, transparent, and hassle-free. Every provider in our network undergoes multi-step identity verification, criminal background checks, and trade skill certifications before accepting bookings.
            </p>
            <p>
              Our automated matching engine pairs customer service requests with nearby available providers in real-time, eliminating phone calls and uncertainty.
            </p>
          </div>
        </div>

        {/* Leadership & Team Section */}
        <div className="bg-slate-900/30 border border-slate-900 p-8 rounded-3xl space-y-6">
          <div className="space-y-2">
            <span className="text-emerald-400 text-xs font-bold uppercase tracking-wider">Leadership & Operations</span>
            <h2 className="text-2xl font-bold text-white">Our Team</h2>
            <p className="text-base text-slate-400 leading-relaxed">
              Our multidisciplinary team unites marketplace engineers, trust & safety specialists, and local service experts dedicated to elevating home service standards.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4">
            <div className="bg-slate-950/60 border border-slate-800 p-6 rounded-2xl space-y-3">
              <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-center text-emerald-400 font-bold text-lg">
                OS
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Operations & Strategy</h3>
                <p className="text-xs text-emerald-400 font-medium">Partner Onboarding & Quality</p>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                Oversees provider vetting, background checks, and service guarantee compliance.
              </p>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 p-6 rounded-2xl space-y-3">
              <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-center text-emerald-400 font-bold text-lg">
                EP
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Engineering & Product</h3>
                <p className="text-xs text-emerald-400 font-medium">Platform Infrastructure</p>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                Builds real-time matching algorithms, mobile apps, and secure booking engines.
              </p>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 p-6 rounded-2xl space-y-3">
              <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-center text-emerald-400 font-bold text-lg">
                CS
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Customer Support</h3>
                <p className="text-xs text-emerald-400 font-medium">Trust & Resident Advocacy</p>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                Ensures 24/7 resolution support for customers and service providers alike.
              </p>
            </div>
          </div>
        </div>
      </div>
  );
}
