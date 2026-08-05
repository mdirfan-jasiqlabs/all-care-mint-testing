'use client';

import React from 'react';
import Link from 'next/link';

export default function HowItWorksPage() {
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
          <Link href="/how-it-works" className="text-white hover:text-emerald-400 transition-colors">How It Works</Link>
          <Link href="/become-a-provider" className="text-slate-300 hover:text-white transition-colors">Become a Provider</Link>
          <Link href="/contact" className="text-slate-300 hover:text-white transition-colors">Contact</Link>
        </div>
        <Link href="/#download" className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold px-5 py-2 rounded-lg text-xs transition-all shadow-md shadow-emerald-500/10">
          Download App
        </Link>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-16 space-y-12 flex-1">
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
      </main>

      <footer className="bg-slate-950 border-t border-slate-900 px-8 py-6 flex justify-between items-center text-xs text-slate-500">
        <span>© 2026 All Care Mint Marketing Team</span>
        <div className="flex space-x-6">
          <Link href="/privacy" className="hover:text-slate-400">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-slate-400">Terms & Conditions</Link>
        </div>
      </footer>
    </div>
  );
}
