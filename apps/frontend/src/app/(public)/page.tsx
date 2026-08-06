'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import WhyChooseUs from '@/components/WhyChooseUs';
import PartnerLeadSection from '@/components/partner/PartnerLeadSection';
import ExploreServicesSection from '@/components/services/ExploreServicesSection';

interface Category {
  id: string;
  name: string;
  description: string;
  iconUrl?: string;
}

export default function PublicHomePage() {
  const [toastMessage, setToastMessage] = useState<{ title: string; desc: string; icon: string } | null>(null);

  // Policy Modal State
  const [policyType, setPolicyType] = useState<'privacy' | 'terms' | null>(null);

  const showToast = (title: string, desc: string, icon = 'ℹ️') => {
    setToastMessage({ title, desc, icon });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const simulateDownload = (type: string) => {
    showToast('App Store Link', `Redirecting to Google Play Store download target for All-Care MINT ${type} Application.`, '📲');
  };

  return (
    <div className="w-full flex-1 flex flex-col justify-between bg-[#060a12] text-slate-100 font-sans relative">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-24 right-8 bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-2xl z-50 flex items-center space-x-3 max-w-sm transition-all duration-300">
          <div className="w-8 h-8 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl flex items-center justify-center font-bold text-sm">
            {toastMessage.icon}
          </div>
          <div className="space-y-0.5">
            <span className="block text-xs font-bold text-white uppercase tracking-wider">{toastMessage.title}</span>
            <p className="text-[11px] text-slate-400 font-medium">{toastMessage.desc}</p>
          </div>
        </div>
      )}

      {/* Background Ambient Glow & Vector Wave Lines */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="absolute bottom-0 right-0 w-[450px] h-[250px] opacity-15 pointer-events-none -z-10">
        <svg viewBox="0 0 500 300" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 250C120 200 250 280 500 150V300H0V250Z" fill="url(#waveGrad)" />
          <defs>
            <linearGradient id="waveGrad" x1="0" y1="0" x2="500" y2="300" gradientUnits="userSpaceOnUse">
              <stop stopColor="#10b981" stopOpacity="0.2" />
              <stop offset="1" stopColor="#060a12" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Main Content Sections */}
      <div className="space-y-6 sm:space-y-8 pb-12">

        {/* HERO SECTION (COMPACT & SLEEK) */}
        <section id="hero" className="relative pt-6 sm:pt-8 md:pt-10 pb-6 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">

          {/* Two-Column Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-6 items-center">
            
            {/* LEFT COLUMN: Content */}
            <div className="lg:col-span-7 space-y-5 text-left">
              
              {/* Trust Badge */}
              <div className="inline-flex items-center space-x-2 bg-slate-900/90 border border-emerald-500/30 px-3.5 py-1 rounded-full backdrop-blur-md shadow-inner">
                <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-emerald-400">
                  TRUSTED HOME SERVICES, ON DEMAND
                </span>
              </div>

              {/* Main Heading */}
              <div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-[1.12] tracking-tight">
                  Home Services, Perfected.<br />
                  <span className="text-emerald-400 font-black relative inline-block mt-1">
                    At Your Doorstep.
                    <svg className="absolute -bottom-1.5 left-0 w-full h-2.5 text-emerald-400/40" viewBox="0 0 100 20" preserveAspectRatio="none" aria-hidden="true">
                      <path d="M0 15 Q 50 0 100 15" stroke="currentColor" strokeWidth="3.5" fill="none" strokeLinecap="round" />
                    </svg>
                  </span>
                </h1>
              </div>

              {/* Supporting Description */}
              <p className="text-slate-300 text-sm sm:text-base max-w-lg font-normal leading-relaxed">
                Book verified local professionals for cleaning, AC repair, plumbing, painting, and more—in{' '}
                <span className="text-emerald-400 font-bold">less than 60 seconds</span>.
              </p>

              {/* Dual Action CTAs */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
                {/* Primary CTA: Book a Service */}
                <Link
                  href="/services"
                  className="group relative flex items-center justify-between bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold px-5 py-3 rounded-xl transition-all duration-200 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:-translate-y-0.5"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-slate-950/15 rounded-lg flex items-center justify-center text-slate-950">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="text-left leading-tight">
                      <span className="block text-xs font-black tracking-wide text-slate-950">BOOK A SERVICE</span>
                      <span className="block text-[10px] font-semibold text-slate-900/90">Find a trusted professional</span>
                    </div>
                  </div>
                  <svg className="w-4 h-4 ml-3 text-slate-950 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>

                {/* Secondary CTA: Become a Service Partner */}
                <Link
                  href="/become-a-provider"
                  className="group flex items-center justify-between bg-slate-950/80 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-white px-5 py-3 rounded-xl transition-all duration-200 shadow-md hover:-translate-y-0.5"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div className="text-left leading-tight">
                      <span className="block text-xs font-bold tracking-wide text-white">BECOME A SERVICE PARTNER</span>
                      <span className="block text-[10px] text-slate-400 font-normal">Join our professional network</span>
                    </div>
                  </div>
                  <svg className="w-4 h-4 ml-3 text-slate-400 group-hover:text-white group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>

              {/* App Download Section (Centered text divider + official Google Play Badge below) */}
              <div className="pt-1 space-y-2.5 max-w-xs">
                {/* Centered Divider with Text */}
                <div className="flex items-center justify-center space-x-2.5">
                  <span className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-slate-800 to-slate-800" />
                  <span className="text-[11px] text-slate-400 font-medium tracking-wide">Also available on</span>
                  <span className="flex-1 h-[1px] bg-gradient-to-l from-transparent via-slate-800 to-slate-800" />
                </div>
                
                {/* Official Google Play Badge Button (Centered below divider) */}
                <div className="flex justify-center">
                  <button
                    onClick={() => simulateDownload('Customer')}
                    aria-label="Get it on Google Play"
                    className="inline-flex items-center space-x-2.5 bg-black border border-slate-800 hover:border-slate-600 px-4 py-2 rounded-xl transition-all cursor-pointer shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {/* Official Colorful Google Play Logo SVG */}
                    <svg className="w-6 h-6 flex-shrink-0" viewBox="0 0 512 512" fill="none">
                      <path d="M32.5 17.5C30.2 19.8 29 23.2 29 27.5V484.5C29 488.8 30.2 492.2 32.5 494.5L33.7 495.7L276.7 252.7V249.3L33.7 6.3L32.5 17.5Z" fill="url(#gplay_a)" />
                      <path d="M357.7 333.7L276.7 252.7V249.3L357.7 168.3L359.1 169.1L455.1 223.7C482.5 239.3 482.5 264.7 455.1 280.3L359.1 334.9L357.7 333.7Z" fill="url(#gplay_b)" />
                      <path d="M359.1 334.9L276.7 252.7L32.5 494.5C40.6 503.1 53.6 504.2 68.7 495.7L359.1 334.9Z" fill="url(#gplay_c)" />
                      <path d="M359.1 169.1L68.7 8.3C53.6-.2 40.6.9 32.5 9.5L276.7 252.7L359.1 169.1Z" fill="url(#gplay_d)" />
                      <defs>
                        <linearGradient id="gplay_a" x1="254" y1="23" x2="16" y2="261" gradientUnits="userSpaceOnUse">
                          <stop stopColor="#00A0FF" />
                          <stop offset="1" stopColor="#00A1FF" />
                        </linearGradient>
                        <linearGradient id="gplay_b" x1="486" y1="256" x2="272" y2="256" gradientUnits="userSpaceOnUse">
                          <stop stopColor="#FFCC00" />
                          <stop offset="1" stopColor="#FFAA00" />
                        </linearGradient>
                        <linearGradient id="gplay_c" x1="337" y1="313" x2="68" y2="502" gradientUnits="userSpaceOnUse">
                          <stop stopColor="#FF3A44" />
                          <stop offset="1" stopColor="#C31162" />
                        </linearGradient>
                        <linearGradient id="gplay_d" x1="68" y1="10" x2="337" y2="199" gradientUnits="userSpaceOnUse">
                          <stop stopColor="#00E676" />
                          <stop offset="1" stopColor="#00B0FF" />
                        </linearGradient>
                      </defs>
                    </svg>

                    <div className="text-left leading-tight">
                      <span className="text-[8px] font-bold tracking-wider text-slate-400 uppercase block">GET IT ON</span>
                      <span className="text-xs font-extrabold text-white tracking-tight block">Google Play</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Trust Features Row (4 Equal Glass Cards inside a single bar) */}
              <div className="pt-4">
                <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-3 backdrop-blur-sm grid grid-cols-2 sm:grid-cols-4 gap-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-800/80">
                  
                  {/* Card 1 */}
                  <div className="space-y-1.5 pt-1.5 sm:pt-0 sm:px-2 first:pt-0 first:px-0">
                    <div className="w-7 h-7 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg flex items-center justify-center">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">Verified Professionals</h4>
                      <p className="text-[10px] text-slate-400 leading-snug">Background verified & skilled experts</p>
                    </div>
                  </div>

                  {/* Card 2 */}
                  <div className="space-y-1.5 pt-1.5 sm:pt-0 sm:px-2">
                    <div className="w-7 h-7 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg flex items-center justify-center">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">Top Rated Services</h4>
                      <p className="text-[10px] text-slate-400 leading-snug">Loved by thousands of happy customers</p>
                    </div>
                  </div>

                  {/* Card 3 */}
                  <div className="space-y-1.5 pt-1.5 sm:pt-0 sm:px-2">
                    <div className="w-7 h-7 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg flex items-center justify-center">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">Quick Booking</h4>
                      <p className="text-[10px] text-slate-400 leading-snug">Book in less than 60 seconds</p>
                    </div>
                  </div>

                  {/* Card 4 */}
                  <div className="space-y-1.5 pt-1.5 sm:pt-0 sm:px-2">
                    <div className="w-7 h-7 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg flex items-center justify-center">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">Secure & Reliable</h4>
                      <p className="text-[10px] text-slate-400 leading-snug">Safe payments & dedicated support</p>
                    </div>
                  </div>

                </div>
              </div>

            </div>

            {/* RIGHT COLUMN: Smartphone Mockup with Branded Technician & Floating Service Chips */}
            <div className="lg:col-span-5 relative flex items-center justify-center min-h-[480px] sm:min-h-[540px] select-none py-4">
              
              {/* Dotted Grid Pattern Background (Top-Left) */}
              <div className="absolute top-0 left-0 grid grid-cols-6 gap-2.5 opacity-25 pointer-events-none z-0">
                {[...Array(36)].map((_, i) => (
                  <div key={i} className="w-1 h-1 rounded-full bg-emerald-400" />
                ))}
              </div>

              {/* Concentric Orbit Rings & Node Connectors (SVG Layer) */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                <svg className="w-full h-full max-w-[520px] max-h-[520px]" viewBox="0 0 520 520" fill="none">
                  {/* Outer Orbit Circle */}
                  <circle cx="260" cy="260" r="220" stroke="#10b981" strokeOpacity="0.25" strokeWidth="1.5" strokeDasharray="6 6" />
                  {/* Inner Orbit Circle */}
                  <circle cx="260" cy="260" r="160" stroke="#10b981" strokeOpacity="0.35" strokeWidth="1.5" />
                  {/* Innermost Ambient Ring */}
                  <circle cx="260" cy="260" r="110" stroke="#10b981" strokeOpacity="0.15" strokeWidth="3" />
                  
                  {/* Glowing Orbit Nodes (Dots on rings matching card anchors) */}
                  <circle cx="115" cy="170" r="4.5" fill="#10b981" className="animate-pulse" />
                  <circle cx="85" cy="260" r="4.5" fill="#10b981" className="animate-pulse" />
                  <circle cx="405" cy="170" r="4.5" fill="#10b981" className="animate-pulse" />
                  <circle cx="435" cy="260" r="4.5" fill="#10b981" className="animate-pulse" />
                  <circle cx="405" cy="350" r="4.5" fill="#10b981" className="animate-pulse" />

                  {/* Connecting dashed lines from nodes to outer bounds */}
                  <path d="M 115 170 L 150 170" stroke="#10b981" strokeOpacity="0.4" strokeWidth="1" strokeDasharray="3 3" />
                  <path d="M 85 260 L 125 260" stroke="#10b981" strokeOpacity="0.4" strokeWidth="1" strokeDasharray="3 3" />
                  <path d="M 405 170 L 370 170" stroke="#10b981" strokeOpacity="0.4" strokeWidth="1" strokeDasharray="3 3" />
                  <path d="M 435 260 L 395 260" stroke="#10b981" strokeOpacity="0.4" strokeWidth="1" strokeDasharray="3 3" />
                  <path d="M 405 350 L 370 350" stroke="#10b981" strokeOpacity="0.4" strokeWidth="1" strokeDasharray="3 3" />
                </svg>

                {/* Center Radial Emerald Glow */}
                <div className="absolute w-80 h-80 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none animate-pulse-glow" />
              </div>

              {/* Smartphone Frame Container */}
              <div className="relative z-10 w-[250px] sm:w-[280px] h-[480px] sm:h-[530px]">
                
                {/* Smartphone Glowing Outer Border & Frame */}
                <div className="absolute inset-0 rounded-[46px] border-[3.5px] border-emerald-400 bg-[#060c18] shadow-[0_0_55px_rgba(16,185,129,0.4)] overflow-hidden flex flex-col justify-between z-10 pointer-events-none">
                  
                  {/* Top Notch & Status Bar */}
                  <div className="relative z-40 pt-3 px-6 flex items-center justify-between text-[11px] text-slate-200 font-semibold tracking-tight">
                    <span>9:41</span>
                    
                    {/* Notch / Dynamic Island */}
                    <div className="w-20 h-4 bg-black border border-slate-800 rounded-full absolute left-1/2 -translate-x-1/2 top-2.5 flex items-center justify-end px-2">
                      <div className="w-2 h-2 rounded-full bg-slate-900 border border-slate-700" />
                    </div>

                    {/* Signal, WiFi, Battery Icons */}
                    <div className="flex items-center space-x-1.5 text-white">
                      {/* Signal */}
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 3v18M6 9v12M18 15v6M2 14v7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                      </svg>
                      {/* WiFi */}
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.14 0M1.393 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                      </svg>
                      {/* Battery */}
                      <div className="w-5 h-2.5 border border-white rounded-sm p-0.5 flex items-center">
                        <div className="w-full h-full bg-white rounded-xs" />
                      </div>
                    </div>
                  </div>

                  {/* Screen Inner Background Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-b from-[#0b172a] via-[#060d1b] to-[#040712] z-10" />

                  {/* Subtle Glow at Bottom of Phone Screen */}
                  <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-emerald-500/30 via-emerald-500/10 to-transparent z-20 pointer-events-none" />
                </div>

                {/* OVERFLOWING TECHNICIAN IMAGE (Transparent PNG cutout, enlarged & blended seamlessly at bottom) */}
                <div className="absolute -inset-x-12 -top-12 -bottom-4 z-20 flex items-center justify-center pointer-events-none overflow-visible">
                  <img
                    src="/technician_hero.png"
                    alt="All-Care MINT Technician"
                    className="w-full h-full object-contain transform scale-115 sm:scale-120 filter drop-shadow-[0_20px_35px_rgba(0,0,0,0.9)] [mask-image:linear-gradient(to_bottom,black_75%,transparent_98%)] [-webkit-mask-image:linear-gradient(to_bottom,black_75%,transparent_98%)]"
                    loading="eager"
                  />
                </div>

              </div>

              {/* FLOATING GLASS SERVICE CHIPS (WITH ASYNCHRONOUS FLOATING ANIMATIONS) */}

              {/* Chip 1: AC Repair (Top Left) */}
              <div className="absolute top-[12%] left-[-10px] sm:left-[-35px] z-30 bg-[#081220]/95 border border-emerald-500/40 backdrop-blur-md px-4 py-2 rounded-2xl shadow-[0_10px_25px_rgba(0,0,0,0.6)] flex items-center space-x-3 hover:scale-105 transition-all duration-300 animate-float-1">
                <div className="w-9 h-9 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-xl flex items-center justify-center flex-shrink-0">
                  {/* Snowflake Icon */}
                  <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v20m-7-3.5l14-13m0 13L5 5.5M17 12H3m14-5l-3.5 3.5M7 17l3.5-3.5M17 17l-3.5-3.5M7 7l3.5 3.5" />
                  </svg>
                </div>
                <span className="text-xs sm:text-sm font-bold text-white tracking-wide">AC Repair</span>
              </div>

              {/* Chip 2: Cleaning (Middle Left) */}
              <div className="absolute top-[48%] -translate-y-1/2 left-[-18px] sm:left-[-50px] z-30 bg-[#081220]/95 border border-emerald-500/40 backdrop-blur-md px-4 py-2 rounded-2xl shadow-[0_10px_25px_rgba(0,0,0,0.6)] flex items-center space-x-3 hover:scale-105 transition-all duration-300 animate-float-2">
                <div className="w-9 h-9 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-xl flex items-center justify-center flex-shrink-0">
                  {/* Broom Icon */}
                  <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 21l8-8m0 0l-3-3m3 3l3 3m-3-3L18.5 5.5a2.121 2.121 0 013 3L11 18.5z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l4 4" />
                  </svg>
                </div>
                <span className="text-xs sm:text-sm font-bold text-white tracking-wide">Cleaning</span>
              </div>

              {/* Chip 4: Plumbing (Top Right) */}
              <div className="absolute top-[14%] right-[-10px] sm:right-[-35px] z-30 bg-[#081220]/95 border border-emerald-500/40 backdrop-blur-md px-4 py-2 rounded-2xl shadow-[0_10px_25px_rgba(0,0,0,0.6)] flex items-center space-x-3 hover:scale-105 transition-all duration-300 animate-float-4">
                <div className="w-9 h-9 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-xl flex items-center justify-center flex-shrink-0">
                  {/* Water Tap / Faucet Icon */}
                  <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v4m0 0H8a2 2 0 00-2 2v2h12v-2a2 2 0 00-2-2h-4zm-4 8v3a2 2 0 002 2h4a2 2 0 002-2v-3" />
                  </svg>
                </div>
                <span className="text-xs sm:text-sm font-bold text-white tracking-wide">Plumbing</span>
              </div>

              {/* Chip 5: Painting (Middle Right) */}
              <div className="absolute top-[46%] -translate-y-1/2 right-[-18px] sm:right-[-50px] z-30 bg-[#081220]/95 border border-emerald-500/40 backdrop-blur-md px-4 py-2 rounded-2xl shadow-[0_10px_25px_rgba(0,0,0,0.6)] flex items-center space-x-3 hover:scale-105 transition-all duration-300 animate-float-5">
                <div className="w-9 h-9 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-xl flex items-center justify-center flex-shrink-0">
                  {/* Paint Roller Icon */}
                  <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4h14a2 2 0 012 2v3a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zm14 7v3a2 2 0 01-2 2h-5v5h-2v-5H4" />
                  </svg>
                </div>
                <span className="text-xs sm:text-sm font-bold text-white tracking-wide">Painting</span>
              </div>

              {/* Chip 6: Electrical (Bottom Right) */}
              <div className="absolute bottom-[16%] right-[-10px] sm:right-[-35px] z-30 bg-[#081220]/95 border border-emerald-500/40 backdrop-blur-md px-4 py-2 rounded-2xl shadow-[0_10px_25px_rgba(0,0,0,0.6)] flex items-center space-x-3 hover:scale-105 transition-all duration-300 animate-float-6">
                <div className="w-9 h-9 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-xl flex items-center justify-center flex-shrink-0">
                  {/* Lightning Bolt Icon */}
                  <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <span className="text-xs sm:text-sm font-bold text-white tracking-wide">Electrical</span>
              </div>

            </div>

          </div>
        </section>

        {/* WHY CHOOSE US SECTION */}
        <WhyChooseUs />


        {/* SERVICES CATEGORIES SECTION */}
        <ExploreServicesSection onShowToast={showToast} />


        {/* BECOME A PROVIDER (LEAD CAPTURE FORM) */}
        <PartnerLeadSection onShowToast={showToast} />


      </div>

      {/* POLICY MODAL OVERLAY */}
      {policyType && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 max-h-[85vh] overflow-y-auto relative shadow-2xl">
            <button
              onClick={() => setPolicyType(null)}
              className="absolute top-6 right-6 text-slate-400 hover:text-white p-1 rounded-full bg-slate-800/50 cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h2 className="text-xl font-extrabold text-white">
              {policyType === 'privacy' ? 'Privacy Policy' : 'Terms & Conditions'}
            </h2>
            <div className="text-xs text-slate-400 leading-relaxed space-y-4">
              {policyType === 'privacy' ? (
                <>
                  <p><strong>Last Updated: July 23, 2026</strong></p>
                  <p>This Privacy Policy describes how All-Care MINT collects, uses, and shares your personal information when you use our public marketing website and our home services marketplace platform.</p>
                  <p><strong>1. Information We Collect</strong><br />We collect personal identifiers such as name, phone number, and city location when you submit forms on our website expressing interest to join as a service partner (Become a Provider form). We collect these to evaluate applicant profiles.</p>
                  <p><strong>2. How We Use Information</strong><br />We use collected provider leads data to verify partner applications, schedule interviews, and establish communication loops. Lead information is saved securely inside the provider_leads database.</p>
                  <p><strong>3. Security Practices</strong><br />We implement server-side validation, cross-site scripting (XSS) input sanitization guards, and SSL encryption. Lead form endpoints are rate-limited to avoid automation spam attacks.</p>
                </>
              ) : (
                <>
                  <p><strong>Last Updated: July 23, 2026</strong></p>
                  <p>Please read these Terms and Conditions carefully before browsing the All-Care MINT marketing website or applying to join our network of service partners.</p>
                  <p><strong>1. Acceptance of Terms</strong><br />By browsing our marketing website, you acknowledge that you have read and understood these Terms. Booking services requires the use of our official mobile application client.</p>
                  <p><strong>2. Provider Leads Submissions</strong><br />Submitting interest via the "Become a Provider" form represents a lead registration. It does NOT guarantee onboarding, account creation, or employment contract terms. All applicants go through separate screening loops.</p>
                  <p><strong>3. Intellectual Property</strong><br />All-Care MINT logo, design tokens, layout structures, and text materials are owned solely by All-Care MINT. Reproduction without written consent is forbidden.</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
