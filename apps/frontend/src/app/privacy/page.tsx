'use client';

import React from 'react';
import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-950 text-slate-100 font-sans">
      <nav className="bg-slate-950/90 border-b border-slate-900 px-6 py-4 flex justify-between items-center sticky top-0 backdrop-blur-md z-40">
        <Link href="/" className="flex items-center space-x-3 text-emerald-400 font-bold text-xl cursor-pointer">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span className="tracking-tight text-white font-extrabold">All Care <span className="text-emerald-400 font-medium">Mint</span></span>
        </Link>
        <div className="hidden md:flex items-center space-x-6 text-sm font-semibold">
          <Link href="/" className="text-slate-300 hover:text-white transition-colors">Home</Link>
          <Link href="/about" className="text-slate-300 hover:text-white transition-colors">About</Link>
          <Link href="/services" className="text-slate-300 hover:text-white transition-colors">Services</Link>
          <Link href="/how-it-works" className="text-slate-300 hover:text-white transition-colors">How It Works</Link>
          <Link href="/become-a-provider" className="text-slate-300 hover:text-white transition-colors">Become a Provider</Link>
          <Link href="/contact" className="text-slate-300 hover:text-white transition-colors">Contact</Link>
        </div>
        <Link href="/#download" className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold px-5 py-2 rounded-lg text-xs transition-all shadow-md shadow-emerald-500/10">
          Download App
        </Link>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-16 space-y-8 flex-1">
        <div className="space-y-3 border-b border-slate-900 pb-6">
          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs px-4 py-1.5 rounded-full uppercase tracking-wider font-bold">
            PG-WEB-007 • Google Play Store Compliance
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
      </main>

      <footer className="bg-slate-950 border-t border-slate-900 px-8 py-6 flex justify-between items-center text-xs text-slate-500">
        <span>© 2026 All Care Mint Marketing Team</span>
        <div className="flex space-x-6">
          <Link href="/privacy" className="text-emerald-400">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-slate-400">Terms & Conditions</Link>
        </div>
      </footer>
    </div>
  );
}
