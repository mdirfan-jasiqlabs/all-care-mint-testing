'use client';

import React from 'react';
import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-4 sm:py-6 space-y-4 flex-1 w-full">
        <div className="space-y-3 border-b border-slate-900 pb-6">
          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs px-4 py-1.5 rounded-full uppercase tracking-wider font-bold">
            Google Play Store Compliance
          </span>
          <h1 className="text-3xl font-extrabold text-white">Privacy Policy</h1>
          <p className="text-sm text-slate-400">Last Updated: July 23, 2026</p>
        </div>

        {/* Table of Contents */}
        <nav className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl space-y-3" aria-label="Table of Contents">
          <h2 className="text-xs uppercase tracking-wider text-slate-400 font-bold">Table of Contents</h2>
          <ul className="space-y-2 text-sm">
            <li>
              <a href="#info-collect" className="text-emerald-400 hover:underline">1. Information We Collect</a>
            </li>
            <li>
              <a href="#how-we-use" className="text-emerald-400 hover:underline">2. How We Use Information</a>
            </li>
            <li>
              <a href="#security-practices" className="text-emerald-400 hover:underline">3. Security Practices & Input Safeguards</a>
            </li>
            <li>
              <a href="#data-sharing" className="text-emerald-400 hover:underline">4. Data Sharing & Retention</a>
            </li>
          </ul>
        </nav>

        <div className="text-base text-slate-300 leading-relaxed space-y-8">
          <section className="space-y-3">
            <h2 id="info-collect" className="scroll-mt-24 text-xl font-bold text-white">1. Information We Collect</h2>
            <p>
              We collect personal identifiers such as full name, 10-digit mobile phone number, city/area location, and optional messages when you submit forms on our website expressing interest to join as a service partner (Become a Provider form).
            </p>
          </section>

          <section className="space-y-3">
            <h2 id="how-we-use" className="scroll-mt-24 text-xl font-bold text-white">2. How We Use Information</h2>
            <p>
              We use collected provider leads data exclusively to evaluate partner applications, verify provider qualifications, schedule interviews, and establish communication loops. Lead information is stored securely in our database.
            </p>
          </section>

          <section className="space-y-3">
            <h2 id="security-practices" className="scroll-mt-24 text-xl font-bold text-white">3. Security Practices & Input Safeguards</h2>
            <p>
              We implement strict server-side validation, cross-site scripting (XSS) input sanitization guards, and SSL encryption. Lead form endpoints are rate-limited to avoid automation spam attacks.
            </p>
          </section>

          <section className="space-y-3">
            <h2 id="data-sharing" className="scroll-mt-24 text-xl font-bold text-white">4. Data Sharing & Retention</h2>
            <p>
              All Care Mint does NOT sell or rent your personal information to third parties. We retain provider lead records until reviewed by platform administrators or upon request for deletion.
            </p>
          </section>
        </div>
      </div>
  );
}
