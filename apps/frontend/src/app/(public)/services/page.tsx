'use client';

import React from 'react';
import ExploreServicesSection from '@/components/services/ExploreServicesSection';
import DownloadAppSection from '@/components/download/DownloadAppSection';

export default function ServicesPage() {
  return (
    <div className="w-full flex-1 flex flex-col justify-between bg-[#060a12] text-slate-100 font-sans relative py-6 sm:py-12">
      
      {/* Background Ambient Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* Main Dynamic Service Categories Section */}
      <ExploreServicesSection />

      {/* Bottom Customer Mobile App CTA Section */}
      <DownloadAppSection />

    </div>
  );
}
