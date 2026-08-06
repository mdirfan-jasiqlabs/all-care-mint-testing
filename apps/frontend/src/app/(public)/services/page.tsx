'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const res = await fetch(`${apiBase}/api/v1/catalog/categories`);
      if (!res.ok) {
        throw new Error(`Failed to load categories (HTTP ${res.status})`);
      }
      const json = await res.json();
      if (json.data && Array.isArray(json.data)) {
        setCategories(json.data);
      } else {
        setCategories([]);
      }
    } catch (err: any) {
      setError(err.message || 'Unable to connect to service catalog.');
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return (
    <div className="max-w-6xl mx-auto px-6 py-16 space-y-12 flex-1 w-full">
        <div className="space-y-4 text-center">
          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs px-4 py-1.5 rounded-full uppercase tracking-wider font-bold">
            PG-WEB-003 • Catalog Browser
          </span>
          <h1 className="text-3xl md:text-5xl font-black text-white">Service Categories</h1>
          <p className="text-slate-400 text-base max-w-xl mx-auto leading-relaxed">
            Browse active service categories available on All Care Mint. Book instantly inside our Customer Mobile App.
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" aria-busy="true">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-slate-900/40 border border-slate-900 p-6 rounded-2xl space-y-3 animate-pulse">
                <div className="w-10 h-10 bg-slate-800 rounded-xl"></div>
                <div className="h-4 bg-slate-800 rounded w-2/3"></div>
                <div className="h-3 bg-slate-800 rounded w-full"></div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="bg-rose-500/10 border border-rose-500/30 p-8 rounded-2xl text-center max-w-md mx-auto space-y-4">
            <svg className="w-10 h-10 text-rose-400 mx-auto" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-sm font-semibold text-rose-300">{error}</p>
            <button
              onClick={fetchCategories}
              className="bg-rose-500 hover:bg-rose-400 text-white text-xs font-bold px-4 py-2 rounded-lg transition-all"
            >
              Retry Connection
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && categories.length === 0 && (
          <div className="bg-slate-900/30 border border-slate-900 p-12 rounded-3xl text-center max-w-md mx-auto space-y-3">
            <svg className="w-12 h-12 text-slate-500 mx-auto" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <h3 className="text-base font-bold text-white">No Categories Available</h3>
            <p className="text-xs text-slate-400">There are currently no active service categories available. Check back soon!</p>
          </div>
        )}

        {/* Category Grid */}
        {!loading && !error && categories.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {categories.map((cat) => (
              <div key={cat.id} className="bg-slate-900/30 border border-slate-900 p-6 rounded-2xl space-y-3 hover:border-emerald-500/30 transition-all">
                <div className="w-10 h-10 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-white">{cat.name}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{cat.description || 'Professional on-demand home service category.'}</p>
              </div>
            ))}
          </div>
        )}

        {/* Download App CTA with Google Play Badge */}
        <div className="bg-slate-900/40 border border-slate-900 p-8 rounded-3xl text-center space-y-6 max-w-2xl mx-auto">
          <div className="space-y-2">
            <h2 className="text-xl md:text-2xl font-extrabold text-white">Book a Service — Download the Customer App</h2>
            <p className="text-sm text-slate-400">Get instant access to vetted local service professionals on Android and iOS.</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/#download"
              className="inline-flex items-center space-x-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold px-6 py-3 rounded-xl text-sm transition-all shadow-lg shadow-emerald-500/10"
            >
              <span>Download Customer App</span>
            </Link>

            {/* Official Google Play Badge CTA */}
            <Link
              href="/#download"
              aria-label="Get it on Google Play"
              className="inline-flex items-center space-x-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white px-5 py-2.5 rounded-xl transition-all"
            >
              <svg className="w-6 h-6 fill-current text-emerald-400" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 20.5v-17c0-.55.3-1.02.76-1.26L14.2 12 3.76 21.76c-.46-.24-.76-.71-.76-1.26zM15.6 13.4l2.76-2.76c.39-.39.39-1.02 0-1.41l-2.76-2.76-2.4 2.4 2.4 2.42zM4.94 1.55L14.2 10.8l-2.4 2.4L3.76 2.24c.3-.16.74-.18 1.18-.69zM4.94 22.45L11.8 15.6l2.4 2.4-9.26 9.25c-.44.51-.88.49-1.18.33z" />
              </svg>
              <div className="text-left leading-tight">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">GET IT ON</span>
                <span className="text-sm font-extrabold text-white block">Google Play</span>
              </div>
            </Link>
          </div>
        </div>
      </div>
  );
}
