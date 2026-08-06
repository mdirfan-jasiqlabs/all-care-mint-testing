'use client';

import React from 'react';
import Link from 'next/link';

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16 space-y-8 flex-1 w-full">
        <div className="space-y-3 border-b border-slate-900 pb-6">
          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs px-4 py-1.5 rounded-full uppercase tracking-wider font-bold">
            PG-WEB-008 • Terms of Service
          </span>
          <h1 className="text-3xl font-extrabold text-white">Terms & Conditions</h1>
          <p className="text-sm text-slate-400">Last Updated: July 23, 2026</p>
        </div>

        {/* Table of Contents */}
        <nav className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl space-y-3" aria-label="Table of Contents">
          <h2 className="text-xs uppercase tracking-wider text-slate-400 font-bold">Table of Contents</h2>
          <ul className="space-y-2 text-sm">
            <li>
              <a href="#acceptance" className="text-emerald-400 hover:underline">1. Acceptance of Terms</a>
            </li>
            <li>
              <a href="#provider-submissions" className="text-emerald-400 hover:underline">2. Provider Lead Submissions</a>
            </li>
            <li>
              <a href="#intellectual-property" className="text-emerald-400 hover:underline">3. Intellectual Property</a>
            </li>
          </ul>
        </nav>

        <div className="text-base text-slate-300 leading-relaxed space-y-8">
          <section className="space-y-3">
            <h2 id="acceptance" className="scroll-mt-24 text-xl font-bold text-white">1. Acceptance of Terms</h2>
            <p>
              By browsing the All Care Mint public marketing website or submitting lead interest forms, you acknowledge that you have read, understood, and agreed to be bound by these Terms.
            </p>
          </section>

          <section className="space-y-3">
            <h2 id="provider-submissions" className="scroll-mt-24 text-xl font-bold text-white">2. Provider Lead Submissions</h2>
            <p>
              Submitting interest via the &quot;Become a Provider&quot; form represents a lead registration. It does NOT guarantee onboarding, account creation, or employment contract terms. All applicants undergo independent background screening.
            </p>
          </section>

          <section className="space-y-3">
            <h2 id="intellectual-property" className="scroll-mt-24 text-xl font-bold text-white">3. Intellectual Property</h2>
            <p>
              All logos, brand assets, design tokens, layout structures, and website copy are owned solely by All Care Mint. Reproduction or unauthorized use without written permission is strictly prohibited.
            </p>
          </section>
        </div>
      </div>
  );
}
