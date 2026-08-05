'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface Category {
  id: string;
  name: string;
  description: string;
  iconUrl?: string;
}

export default function ServicesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
        const res = await fetch(`${apiBase}/api/v1/public/categories`);
        if (res.ok) {
          const json = await res.json();
          if (json.data && Array.isArray(json.data) && json.data.length > 0) {
            setCategories(json.data);
          } else {
            setCategories(fallback);
          }
        } else {
          setCategories(fallback);
        }
      } catch {
        setCategories(fallback);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const fallback: Category[] = [
    { id: '1', name: 'Cleaning & Sanitization', description: 'Full apartment scrubbing, kitchen deep cleaning, and disinfecting.' },
    { id: '2', name: 'Electrical Work', description: 'Fan installation, short circuit fixes, switchboard wiring, and backup repair.' },
    { id: '3', name: 'Plumbing & Pipelines', description: 'Drain cleaning, tap replacements, geyser installation, and pipelines fixing.' },
    { id: '4', name: 'AC & Appliance Maintenance', description: 'Geyser repairs, refrigerator gas refills, and AC duct filters sanitization.' },
  ];

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
          <Link href="/services" className="text-white hover:text-emerald-400 transition-colors">Services</Link>
          <Link href="/how-it-works" className="text-slate-300 hover:text-white transition-colors">How It Works</Link>
          <Link href="/become-a-provider" className="text-slate-300 hover:text-white transition-colors">Become a Provider</Link>
          <Link href="/contact" className="text-slate-300 hover:text-white transition-colors">Contact</Link>
        </div>
        <Link href="/#download" className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold px-5 py-2 rounded-lg text-xs transition-all shadow-md shadow-emerald-500/10">
          Download App
        </Link>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-16 space-y-12 flex-1">
        <div className="space-y-4 text-center">
          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs px-4 py-1.5 rounded-full uppercase tracking-wider font-bold">
            PG-WEB-003 • Catalog Browser
          </span>
          <h1 className="text-3xl md:text-5xl font-black text-white">Service Categories</h1>
          <p className="text-slate-400 text-sm md:text-base max-w-xl mx-auto">
            Browse active service categories available on All Care Mint. Book instantly inside our Customer Mobile App.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-slate-900/40 border border-slate-900 p-6 rounded-2xl space-y-3 animate-pulse">
                <div className="w-10 h-10 bg-slate-800 rounded-xl"></div>
                <div className="h-4 bg-slate-800 rounded w-2/3"></div>
                <div className="h-3 bg-slate-800 rounded w-full"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {categories.map((cat) => (
              <div key={cat.id} className="bg-slate-900/30 border border-slate-900 p-6 rounded-2xl space-y-3 hover:border-emerald-500/30 transition-all">
                <div className="w-10 h-10 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h3 className="text-sm font-bold text-white">{cat.name}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{cat.description}</p>
              </div>
            ))}
          </div>
        )}

        <div className="text-center pt-8">
          <Link href="/#download" className="inline-block bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold px-8 py-3.5 rounded-xl text-xs shadow-lg shadow-emerald-500/10">
            Book a Service — Download Customer App
          </Link>
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
