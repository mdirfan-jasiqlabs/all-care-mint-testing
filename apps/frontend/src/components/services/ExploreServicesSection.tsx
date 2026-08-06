'use client';

import React, { useState, useEffect } from 'react';
import ServiceCard, { CategoryData } from './ServiceCard';

interface ExploreServicesSectionProps {
  onShowToast?: (title: string, desc: string, icon?: string) => void;
}

const defaultCategories: CategoryData[] = [
  {
    id: '1',
    name: 'Cleaning',
    description: 'Professional home cleaning and deep cleaning services',
  },
  {
    id: '2',
    name: 'AC Repair',
    description: 'Professional AC repair and service',
  },
  {
    id: '3',
    name: 'Plumbing',
    description: 'Expert plumbing repairs and installation services',
  },
  {
    id: '4',
    name: 'Painting',
    description: 'Professional home wall painting services',
  },
];

export const ExploreServicesSection: React.FC<ExploreServicesSectionProps> = ({ onShowToast }) => {
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
      const res = await fetch(`${apiBase}/api/v1/public/categories`);
      if (res.ok) {
        const json = await res.json();
        if (json.data && Array.isArray(json.data) && json.data.length > 0) {
          setCategories(json.data);
        } else {
          setCategories(defaultCategories);
        }
      } else {
        setCategories(defaultCategories);
      }
      if (isManualRefresh && onShowToast) {
        onShowToast('Categories Updated', 'Service catalog listings refreshed successfully.', '🔄');
      }
    } catch {
      setCategories(defaultCategories);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  return (
    <section id="services" aria-labelledby="services-heading" className="py-4 sm:py-8 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-8">
      {/* SECTION HEADER: TOP ROW (LEFT BADGE, RIGHT REFRESH) + CENTERED HEADING */}
      <div className="space-y-4 max-w-6xl mx-auto">
        
        {/* Top Row: Left Badge & Right Refresh Button */}
        <div className="w-full flex items-center justify-between gap-4">
          
          {/* Left Glass Pill Badge */}
          <div className="inline-flex items-center space-x-2 bg-[#04141c]/95 border border-emerald-500/40 px-3.5 sm:px-4 py-1.5 rounded-full backdrop-blur-md shadow-[0_0_18px_rgba(16,185,129,0.18)] text-emerald-400 text-xs font-bold uppercase tracking-wider">
            {/* Category Grid Icon */}
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            <span>OUR SERVICES</span>
          </div>

          {/* Right Refresh List Button */}
          <button
            onClick={() => fetchCategories(true)}
            disabled={loading || refreshing}
            className="inline-flex items-center space-x-2 bg-[#050e18]/80 hover:bg-[#091624] border border-[#14263b] hover:border-emerald-500/50 text-white disabled:opacity-50 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-semibold backdrop-blur-md transition-all shadow-md cursor-pointer active:scale-95"
            aria-label="Refresh service categories list"
          >
            {/* Sync Circle Arrows Icon */}
            <svg
              className={`w-3.5 h-3.5 text-emerald-400 ${refreshing ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{refreshing ? 'Refreshing...' : 'Refresh List'}</span>
          </button>
        </div>

        {/* Centered Heading & Subtitle */}
        <div className="text-center space-y-3 max-w-3xl mx-auto pt-2">
          {/* Main Heading */}
          <h2 id="services-heading" className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight tracking-tight">
            Explore Our <span className="text-emerald-400 font-black">Services</span>
          </h2>

          {/* Subtitle Description */}
          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed max-w-xl mx-auto font-normal">
            Dynamic category options loaded directly from public catalog listings API.
          </p>
        </div>

      </div>

      {/* SERVICE GRID / LOADING SKELETON */}
      <div className="relative min-h-[260px]">
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-[#060d19]/80 border border-[#14263b] rounded-[22px] p-6 space-y-4 animate-pulse">
                <div className="w-16 h-16 bg-slate-800 rounded-2xl"></div>
                <div className="h-5 bg-slate-800 rounded w-3/4"></div>
                <div className="w-7 h-0.5 bg-slate-800 rounded-full"></div>
                <div className="h-3.5 bg-slate-800 rounded w-full"></div>
                <div className="h-3.5 bg-slate-800 rounded w-2/3"></div>
                <div className="pt-4">
                  <div className="w-28 h-8 bg-slate-800 rounded-full"></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
            {categories.map((cat) => (
              <ServiceCard key={cat.id} category={cat} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default ExploreServicesSection;
