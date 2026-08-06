'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface Category {
  id: string;
  name: string;
  description: string;
  iconUrl?: string;
}

export default function PublicHomePage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<{ title: string; desc: string; icon: string } | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [interest, setInterest] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formAlert, setFormAlert] = useState<{ type: 'success' | 'error' | 'rate-limit'; message: string } | null>(null);
  const [formErrors, setFormErrors] = useState<{ name?: boolean; phone?: boolean; city?: boolean; interest?: boolean }>({});

  // Policy Modal State
  const [policyType, setPolicyType] = useState<'privacy' | 'terms' | null>(null);

  const showToast = (title: string, desc: string, icon = 'ℹ️') => {
    setToastMessage({ title, desc, icon });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const fetchCategories = async () => {
    setLoadingCategories(true);
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
    } catch {
      setCategories(defaultCategories);
    } finally {
      setLoadingCategories(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const defaultCategories: Category[] = [
    {
      id: '1',
      name: 'Cleaning & Sanitization',
      description: 'Full apartment scrubbing, kitchen deep cleaning, and disinfecting.',
    },
    {
      id: '2',
      name: 'Electrical Work',
      description: 'Fan installation, short circuit fixes, switchboard wiring, and backup repair.',
    },
    {
      id: '3',
      name: 'Plumbing & Pipelines',
      description: 'Drain cleaning, tap replacements, geyser installation, and pipelines fixing.',
    },
    {
      id: '4',
      name: 'AC & Appliance Maintenance',
      description: 'Geyser repairs, refrigerator gas refills, and AC duct filters sanitization.',
    },
  ];

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormAlert(null);
    const errors: { name?: boolean; phone?: boolean; city?: boolean; interest?: boolean } = {};

    const cleanName = name.trim();
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    const cleanCity = city.trim();

    if (!cleanName) errors.name = true;
    if (!cleanPhone || cleanPhone.length !== 10 || !/^[6-9][0-9]{9}$/.test(cleanPhone)) errors.phone = true;
    if (!cleanCity) errors.city = true;
    if (!interest) errors.interest = true;

    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      showToast('Validation Error', 'Please fill in all required fields correctly.', '❌');
      return;
    }

    try {
      setSubmitting(true);
      const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
      const res = await fetch(`${apiBase}/api/v1/public/provider-leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanName,
          mobileNumber: cleanPhone,
          serviceArea: cleanCity,
          serviceType: interest,
          message,
        }),
      });

      const json = await res.json().catch(() => null);

      if (res.status === 429) {
        setFormAlert({
          type: 'rate-limit',
          message: 'Rate Limited: Too many lead submissions. Maximum 5 submissions per hour allowed.',
        });
        return;
      }

      if (!res.ok || !json?.success) {
        throw new Error(json?.message || json?.error?.message || 'Failed to submit lead request.');
      }

      setFormAlert({
        type: 'success',
        message: "Thank you! Your lead request has been recorded. Our partner team will reach out to you shortly.",
      });
      setName('');
      setPhone('');
      setCity('');
      setInterest('');
      setMessage('');
      showToast('Lead Recorded', 'Provider application lead submitted successfully.', '✅');
    } catch (err: any) {
      setFormAlert({
        type: 'error',
        message: err.message || 'An error occurred while submitting your application.',
      });
      showToast('Submission Error', err.message || 'Failed to submit application lead.', '❌');
    } finally {
      setSubmitting(false);
    }
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
      <div className="space-y-16 pb-16">

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
                  Home Services,<br />
                  Perfected.<br />
                  <span className="text-emerald-400 font-black relative inline-block">
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
            <div className="lg:col-span-5 relative flex items-center justify-center min-h-[380px] sm:min-h-[440px]">
              
              {/* Radial Glowing Background Rings */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-60 h-60 sm:w-72 sm:h-72 rounded-full border border-emerald-500/20 animate-pulse" />
                <div className="absolute w-80 h-80 sm:w-[380px] sm:h-[380px] rounded-full border border-emerald-500/10" />
                <div className="absolute w-52 h-52 sm:w-64 sm:h-64 bg-emerald-500/15 rounded-full blur-2xl" />
              </div>

              {/* Smartphone Frame Container (Compact 250px-270px) */}
              <div className="relative z-10 w-56 sm:w-64 md:w-68 rounded-[36px] border-4 border-emerald-500/40 bg-slate-950 shadow-xl shadow-emerald-500/20 p-1.5 overflow-hidden">
                
                {/* Smartphone Status Bar Mockup */}
                <div className="bg-slate-900/90 rounded-t-[28px] px-5 py-2 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>9:41</span>
                  <div className="flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    <svg className="w-3 h-3 text-slate-300" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 3c-4.97 0-9 4.03-9 9 0 2.12.74 4.07 1.97 5.61L4.35 21l3.39-.62C9.28 20.73 10.6 21 12 21c4.97 0 9-4.03 9-9s-4.03-9-9-9z" />
                    </svg>
                  </div>
                </div>

                {/* Smartphone Screen Image Content */}
                <div className="relative rounded-[26px] overflow-hidden bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 flex flex-col items-center">
                  
                  {/* Technician Image */}
                  <img
                    src="/technician_hero.png"
                    alt="All-Care MINT Verified Service Technician"
                    className="w-full h-auto object-cover max-h-[360px] transform hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />

                  {/* Gradient Overlay at Bottom of Phone */}
                  <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
                </div>
              </div>

              {/* FLOATING GLASS SERVICE CHIPS (SLEEK & COMPACT) */}

              {/* Chip 1: AC Repair (Top Left) */}
              <div className="absolute top-2 left-0 sm:-left-3 z-20 bg-slate-900/90 border border-emerald-500/30 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-lg flex items-center space-x-2 hover:scale-105 transition-transform">
                <div className="w-6 h-6 bg-emerald-500/10 text-emerald-400 rounded-lg flex items-center justify-center">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18m9-9H3m15.364 6.364l-12.728-12.728m12.728 0L6.364 18.364" />
                  </svg>
                </div>
                <span className="text-[11px] font-bold text-white">AC Repair</span>
              </div>

              {/* Chip 2: Cleaning (Middle/Bottom Left) */}
              <div className="absolute bottom-12 left-1 sm:-left-5 z-20 bg-slate-900/90 border border-emerald-500/30 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-lg flex items-center space-x-2 hover:scale-105 transition-transform">
                <div className="w-6 h-6 bg-emerald-500/10 text-emerald-400 rounded-lg flex items-center justify-center">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <span className="text-[11px] font-bold text-white">Cleaning</span>
              </div>

              {/* Chip 3: Plumbing (Top Right) */}
              <div className="absolute top-8 right-0 sm:-right-3 z-20 bg-slate-900/90 border border-emerald-500/30 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-lg flex items-center space-x-2 hover:scale-105 transition-transform">
                <div className="w-6 h-6 bg-emerald-500/10 text-emerald-400 rounded-lg flex items-center justify-center">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                </div>
                <span className="text-[11px] font-bold text-white">Plumbing</span>
              </div>

              {/* Chip 4: Painting (Middle Right) */}
              <div className="absolute top-1/2 -translate-y-1/2 right-1 sm:-right-6 z-20 bg-slate-900/90 border border-emerald-500/30 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-lg flex items-center space-x-2 hover:scale-105 transition-transform">
                <div className="w-6 h-6 bg-emerald-500/10 text-emerald-400 rounded-lg flex items-center justify-center">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                  </svg>
                </div>
                <span className="text-[11px] font-bold text-white">Painting</span>
              </div>

              {/* Chip 5: Electrical (Bottom Right) */}
              <div className="absolute bottom-8 right-2 sm:-right-3 z-20 bg-slate-900/90 border border-emerald-500/30 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-lg flex items-center space-x-2 hover:scale-105 transition-transform">
                <div className="w-6 h-6 bg-emerald-500/10 text-emerald-400 rounded-lg flex items-center justify-center">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <span className="text-[11px] font-bold text-white">Electrical</span>
              </div>

            </div>

          </div>
        </section>

        {/* ABOUT SECTION */}
        <section id="about" className="px-8 max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-2">
            <h2 className="text-2xl md:text-3xl font-extrabold text-white">Why Choose All-Care MINT?</h2>
            <p className="text-xs text-slate-400 max-w-md mx-auto">We connect you with qualified service professionals safely and transparently.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-900/30 border border-slate-900 p-6 rounded-2xl space-y-3">
              <div className="w-10 h-10 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">100% Verified Partners</h3>
              <p className="text-xs text-slate-400 leading-relaxed">Every professional goes through rigorous background verification and certifications checks before joining the directory.</p>
            </div>

            <div className="bg-slate-900/30 border border-slate-900 p-6 rounded-2xl space-y-3">
              <div className="w-10 h-10 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Fixed Pricing Model</h3>
              <p className="text-xs text-slate-400 leading-relaxed">No hidden charges or surprise fees. See clear pricing lists directly in-app before booking service slots.</p>
            </div>

            <div className="bg-slate-900/30 border border-slate-900 p-6 rounded-2xl space-y-3">
              <div className="w-10 h-10 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Swift Local Dispatch</h3>
              <p className="text-xs text-slate-400 leading-relaxed">System algorithms locate nearby active professionals to assign booking jobs quickly.</p>
            </div>
          </div>
        </section>

        {/* SERVICES CATEGORIES SECTION */}
        <section id="services" className="px-8 max-w-6xl mx-auto space-y-12">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
              <h2 className="text-2xl md:text-3xl font-extrabold text-white">Explore Our Services</h2>
              <p className="text-xs text-slate-400">Dynamic category options loaded directly from public catalog listings API.</p>
            </div>
            <button
              onClick={() => {
                fetchCategories();
                showToast('Categories Updated', 'Service catalog listings refreshed successfully.', '🔄');
              }}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer"
            >
              Refresh List
            </button>
          </div>

          <div className="relative min-h-[160px]">
            {loadingCategories && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-slate-900/40 border border-slate-900/60 p-6 rounded-2xl space-y-3 animate-pulse">
                    <div className="w-10 h-10 bg-slate-800 rounded-xl"></div>
                    <div className="h-4 bg-slate-800 rounded w-2/3"></div>
                    <div className="h-3 bg-slate-800 rounded w-full"></div>
                  </div>
                ))}
              </div>
            )}

            {!loadingCategories && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {categories.map((cat) => (
                  <div key={cat.id} className="bg-slate-900/30 border border-slate-900 p-6 rounded-2xl space-y-3 hover:border-emerald-500/30 transition-all">
                    <div className="w-10 h-10 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl flex items-center justify-center">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                    <h3 className="text-base font-bold text-white">{cat.name}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">{cat.description || 'Professional on-demand home service category.'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* BECOME A PROVIDER (LEAD CAPTURE FORM) */}
        <section id="partner" className="px-8 max-w-4xl mx-auto space-y-8">
          <div className="bg-slate-900/40 border border-slate-900 p-8 rounded-3xl space-y-8">
            <div className="text-center space-y-2">
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs px-3.5 py-1 rounded-full uppercase tracking-wider font-bold">
                Partner Lead Form
              </span>
              <h2 className="text-2xl md:text-3xl font-extrabold text-white">Join As A Service Partner</h2>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Are you a skilled electrician, plumber, or appliance technician? Register your interest below to receive client bookings.
              </p>
            </div>

            {formAlert && (
              <div
                className={`p-4 rounded-xl text-xs font-semibold ${
                  formAlert.type === 'success'
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                    : formAlert.type === 'rate-limit'
                    ? 'bg-amber-500/10 border border-amber-500/30 text-amber-300'
                    : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
                }`}
              >
                {formAlert.message}
              </div>
            )}

            <form onSubmit={handleLeadSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                    Full Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className={`w-full bg-slate-950 border ${
                      formErrors.name ? 'border-rose-500' : 'border-slate-800 focus:border-emerald-500'
                    } rounded-xl px-4 py-2.5 text-xs text-white outline-none transition-colors`}
                  />
                  {formErrors.name && <span className="text-[10px] text-rose-400 font-medium">Name is required.</span>}
                </div>

                {/* Mobile Number */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                    10-Digit Mobile Phone <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="tel"
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="e.g. 9876543210"
                    className={`w-full bg-slate-950 border ${
                      formErrors.phone ? 'border-rose-500' : 'border-slate-800 focus:border-emerald-500'
                    } rounded-xl px-4 py-2.5 text-xs text-white outline-none transition-colors`}
                  />
                  {formErrors.phone && <span className="text-[10px] text-rose-400 font-medium">Enter valid 10-digit Indian mobile number.</span>}
                </div>

                {/* City Location */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                    City / Primary Service Area <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Indore / Bengaluru"
                    className={`w-full bg-slate-950 border ${
                      formErrors.city ? 'border-rose-500' : 'border-slate-800 focus:border-emerald-500'
                    } rounded-xl px-4 py-2.5 text-xs text-white outline-none transition-colors`}
                  />
                  {formErrors.city && <span className="text-[10px] text-rose-400 font-medium">City location is required.</span>}
                </div>

                {/* Service Interest */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                    Primary Trade / Skill <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={interest}
                    onChange={(e) => setInterest(e.target.value)}
                    className={`w-full bg-slate-950 border ${
                      formErrors.interest ? 'border-rose-500' : 'border-slate-800 focus:border-emerald-500'
                    } rounded-xl px-4 py-2.5 text-xs text-white outline-none transition-colors`}
                  >
                    <option value="">-- Select Service Trade --</option>
                    <option value="Plumbing">Plumbing & Pipelines</option>
                    <option value="Electrical">Electrical Work</option>
                    <option value="Cleaning">Cleaning & Sanitization</option>
                    <option value="Appliance">AC & Appliance Repair</option>
                    <option value="Painting">Home Painting Services</option>
                    <option value="Other">Other Skilled Service</option>
                  </select>
                  {formErrors.interest && <span className="text-[10px] text-rose-400 font-medium">Please select a service trade.</span>}
                </div>
              </div>

              {/* Message Optional */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  Additional Notes (Optional)
                </label>
                <textarea
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Mention your years of experience, tools owned, or certifications..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-xs text-white outline-none transition-colors resize-none"
                />
              </div>

              <div className="text-center pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 text-slate-950 font-black px-8 py-3 rounded-xl text-xs transition-all shadow-lg shadow-emerald-500/10 cursor-pointer"
                >
                  {submitting ? 'Submitting Application...' : 'Submit Lead Interest Application'}
                </button>
              </div>
            </form>
          </div>
        </section>

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
