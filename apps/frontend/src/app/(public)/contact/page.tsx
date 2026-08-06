'use client';

import React from 'react';
import Link from 'next/link';

export default function ContactPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-16 space-y-12 flex-1 w-full text-center">
        <div className="space-y-4">
          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs px-4 py-1.5 rounded-full uppercase tracking-wider font-bold">
            PG-WEB-006 • Support & Contact
          </span>
          <h1 className="text-3xl md:text-5xl font-black text-white">Contact Us</h1>
          <p className="text-slate-400 text-base max-w-xl mx-auto leading-relaxed">
            Have questions about booking services or partner onboarding? We are here to help.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-base font-medium text-left">
          <div className="bg-slate-900/30 border border-slate-900 p-6 rounded-2xl space-y-2">
            <span className="text-slate-500 font-bold uppercase tracking-wider text-xs block">Email Support</span>
            <p className="text-white text-base font-semibold">
              <a href="mailto:support@allcaremint.com" className="hover:text-emerald-400 transition-colors">support@allcaremint.com</a>
            </p>
            <p className="text-slate-400 text-sm">Response time within 24 hours</p>
          </div>

          <div className="bg-slate-900/30 border border-slate-900 p-6 rounded-2xl space-y-2">
            <span className="text-slate-500 font-bold uppercase tracking-wider text-xs block">Phone Support</span>
            <p className="text-white text-base font-semibold">
              <a href="tel:+9118006468227" className="hover:text-emerald-400 transition-colors">+91 1800-MINT-CARE</a>
            </p>
            <p className="text-slate-400 text-sm">Toll-free customer hotline</p>
          </div>

          <div className="bg-slate-900/30 border border-slate-900 p-6 rounded-2xl space-y-2">
            <span className="text-slate-500 font-bold uppercase tracking-wider text-xs block">Headquarters</span>
            <p className="text-white text-base font-semibold">BKC, Mumbai, Maharashtra</p>
            <p className="text-slate-400 text-sm">Operating Hours: Mon - Sat, 9 AM - 8 PM IST</p>
          </div>
        </div>
      </div>
  );
}
