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
    showToast('App Store Link', `Redirecting to Google Play Store download target for All Care Mint ${type} Application.`, '📲');
  };

  return (
    <div className="min-h-screen flex flex-col justify-between overflow-x-hidden bg-slate-950 text-slate-100 font-sans">
      
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



      {/* Main Content Sections */}
      <div className="space-y-24 pb-20">

        {/* HERO SECTION */}
        <section id="hero" className="relative pt-20 px-8 max-w-6xl mx-auto flex flex-col items-center text-center space-y-8">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.08),transparent_50%)]"></div>
          <div className="space-y-4">
            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs px-4 py-1.5 rounded-full uppercase tracking-wider font-bold">
              On-Demand Home Services
            </span>
            <h1 className="text-4xl md:text-6xl font-black text-white leading-tight max-w-4xl">
              Home Services, Perfected.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">At Your Doorstep.</span>
            </h1>
            <p className="text-slate-400 text-sm md:text-lg max-w-2xl mx-auto font-medium">
              Get verified, top-rated local service professionals for plumbing, electrical, cleaning, and appliance repair in under 60 seconds.
            </p>
          </div>

          <div id="download" className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => simulateDownload('Customer')}
              className="flex items-center space-x-3 bg-slate-900 border border-slate-800 hover:border-emerald-500/30 px-5 py-2.5 rounded-xl transition-all text-left w-56 cursor-pointer"
            >
              <svg className="w-8 h-8 text-emerald-400 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M5.23 3.001c-.13 0-.25.04-.36.12l10.96 10.97 3.39-3.39c.58-.58.58-1.5 0-2.08L14.7.751c-.96-.96-2.52-.96-3.48 0L5.23 3.001zM3.46 4.391c-.3.37-.46.85-.46 1.36v12.5c0 .51.16.99.46 1.36L14.07 12 3.46 4.391zm1.77 16.49c.11.08.23.12.36.12h6c.96 0 1.91-.38 2.59-1.06l3.05-3.05-12 12zM21 12c0-.5-.19-.99-.54-1.34l-3.23-3.23-2.6 2.6L20.46 13.34c.35-.35.54-.84.54-1.34z" />
              </svg>
              <div>
                <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold font-mono">Get Customer App</div>
                <div className="text-xs text-white font-extrabold font-mono">Google Play Store</div>
              </div>
            </button>

            <button
              onClick={() => simulateDownload('Provider')}
              className="flex items-center space-x-3 bg-slate-900 border border-slate-800 hover:border-emerald-500/30 px-5 py-2.5 rounded-xl transition-all text-left w-56 cursor-pointer"
            >
              <svg className="w-8 h-8 text-emerald-400 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H7c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.04-.42 1.99-1.07 2.75z" />
              </svg>
              <div>
                <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold font-mono">Become a Partner</div>
                <div className="text-xs text-white font-extrabold font-mono">Partner App Store</div>
              </div>
            </button>
          </div>
        </section>

        {/* ABOUT SECTION */}
        <section id="about" className="px-8 max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-2">
            <h2 className="text-2xl md:text-3xl font-extrabold text-white">Why Choose All Care Mint?</h2>
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
                {categories.map((cat, idx) => (
                  <div key={cat.id || idx} className="bg-slate-900/20 border border-slate-900 p-6 rounded-2xl space-y-3 group hover:border-emerald-500/25 transition-all">
                    <div className="w-10 h-10 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl flex items-center justify-center">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-bold text-white font-mono">{cat.name}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">{cat.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* HOW IT WORKS SECTION */}
        <section id="how-it-works" className="px-8 max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-2">
            <h2 className="text-2xl md:text-3xl font-extrabold text-white">How It Works</h2>
            <p className="text-xs text-slate-400 max-w-md mx-auto">Get your home services resolved in three simple steps.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            <div className="flex flex-col items-center text-center space-y-4 relative">
              <div className="w-12 h-12 bg-emerald-500 text-slate-950 font-extrabold text-lg rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/20">1</div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Select Service</h3>
              <p className="text-xs text-slate-400 leading-relaxed max-w-xs">Browse our fixed-price service lists and select your required slots on the Customer mobile app.</p>
            </div>

            <div className="flex flex-col items-center text-center space-y-4 relative">
              <div className="w-12 h-12 bg-emerald-500 text-slate-950 font-extrabold text-lg rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/20">2</div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Provider Matched</h3>
              <p className="text-xs text-slate-400 leading-relaxed max-w-xs">System algorithms dispatch booking requests to the nearest verified service professional instantly.</p>
            </div>

            <div className="flex flex-col items-center text-center space-y-4 relative">
              <div className="w-12 h-12 bg-emerald-500 text-slate-950 font-extrabold text-lg rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/20">3</div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Get It Done</h3>
              <p className="text-xs text-slate-400 leading-relaxed max-w-xs">The matched expert visits your location, completes the job, and you pay securely inside the app.</p>
            </div>
          </div>
        </section>

        {/* BECOME A PROVIDER (LEAD CAPTURE FORM) */}
        <section id="become-a-provider" className="px-8 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5 space-y-6">
            <div className="space-y-2">
              <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider">Partner with us</span>
              <h2 className="text-3xl md:text-4xl font-extrabold text-white leading-tight">Grow Your Service Business</h2>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Join All Care Mint as a service partner. Set your own schedule, receive payouts weekly, and get assigned to verified clients nearby.
            </p>
            <div className="space-y-3 text-xs text-slate-300">
              <div className="flex items-center space-x-3">
                <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                <span><strong>Weekly Payouts</strong> sent directly to your bank account</span>
              </div>
              <div className="flex items-center space-x-3">
                <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                <span><strong>Flexible Hours</strong>: You pick when you want to accept jobs</span>
              </div>
              <div className="flex items-center space-x-3">
                <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                <span><strong>Partner Support</strong> dedicated team assisting you 24/7</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 bg-slate-900/20 border border-slate-900 p-8 rounded-3xl relative overflow-hidden">
            {formAlert && (
              <div
                className={`mb-6 p-4 rounded-xl text-xs flex justify-between items-center transition-all ${
                  formAlert.type === 'success'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}
              >
                <span>{formAlert.message}</span>
              </div>
            )}

            <form onSubmit={handleLeadSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="input-name" className="text-xs text-slate-400 font-medium">Full Name <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  id="input-name"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`w-full bg-slate-950 border ${formErrors.name ? 'border-rose-500' : 'border-slate-800'} rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-emerald-500`}
                />
                {formErrors.name && <span className="text-[10px] text-rose-500 font-mono mt-1 block">Full Name is required.</span>}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="input-phone" className="text-xs text-slate-400 font-medium">Mobile Number (10-Digit) <span className="text-rose-500">*</span></label>
                <input
                  type="tel"
                  id="input-phone"
                  maxLength={10}
                  placeholder="9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  className={`w-full bg-slate-950 border ${formErrors.phone ? 'border-rose-500' : 'border-slate-800'} rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-emerald-500`}
                />
                {formErrors.phone && <span className="text-[10px] text-rose-500 font-mono mt-1 block">Valid 10-digit Indian mobile number required.</span>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="input-city" className="text-xs text-slate-400 font-medium">City / Area <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    id="input-city"
                    placeholder="Mumbai"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className={`w-full bg-slate-950 border ${formErrors.city ? 'border-rose-500' : 'border-slate-800'} rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-emerald-500`}
                  />
                  {formErrors.city && <span className="text-[10px] text-rose-500 font-mono mt-1 block">City/Area is required.</span>}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="input-interest" className="text-xs text-slate-400 font-medium">Service Interest <span className="text-rose-500">*</span></label>
                  <select
                    id="input-interest"
                    value={interest}
                    onChange={(e) => setInterest(e.target.value)}
                    className={`w-full bg-slate-950 border ${formErrors.interest ? 'border-rose-500' : 'border-slate-800'} rounded-xl px-4 py-3 text-xs text-slate-300 outline-none focus:border-emerald-500 cursor-pointer`}
                  >
                    <option value="">Select Service Category</option>
                    <option value="cleaning">Cleaning & Sanitization</option>
                    <option value="electrical">Electrical Work</option>
                    <option value="plumbing">Plumbing & Pipelines</option>
                    <option value="appliance">Appliance Maintenance</option>
                  </select>
                  {formErrors.interest && <span className="text-[10px] text-rose-500 font-mono mt-1 block">Service Interest is required.</span>}
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="input-message" className="text-xs text-slate-400 font-medium">Brief Message <span className="text-slate-500">(Optional)</span></label>
                <textarea
                  id="input-message"
                  rows={3}
                  maxLength={500}
                  placeholder="Tell us about your work experience..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-emerald-500 resize-none"
                ></textarea>
              </div>

              <button
                type="submit"
                id="btn-submit"
                disabled={submitting}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold py-3.5 rounded-xl text-xs transition-all shadow-lg shadow-emerald-500/10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting Application...' : 'Submit Application'}
              </button>
            </form>
          </div>
        </section>

        {/* CONTACT SECTION */}
        <section id="contact" className="px-8 max-w-4xl mx-auto space-y-8 text-center">
          <div className="space-y-2">
            <h2 className="text-2xl md:text-3xl font-extrabold text-white">Get in Touch</h2>
            <p className="text-xs text-slate-400">Have questions about booking services or partner onboarding? We are here to help.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs font-medium">
            <div className="bg-slate-900/20 border border-slate-900 p-5 rounded-xl space-y-1">
              <span className="text-slate-500 font-bold uppercase tracking-wider">Email Support</span>
              <p className="text-white text-sm font-semibold">
                <a href="mailto:support@allcaremint.com" className="hover:text-emerald-400">support@allcaremint.com</a>
              </p>
            </div>
            <div className="bg-slate-900/20 border border-slate-900 p-5 rounded-xl space-y-1">
              <span className="text-slate-500 font-bold uppercase tracking-wider">Headquarters</span>
              <p className="text-white text-sm font-semibold">BKC, Mumbai, Maharashtra</p>
            </div>
          </div>
        </section>
      </div>

      {/* POLICY MODAL OVERLAY */}
      {policyType && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-8 max-h-[80vh] overflow-y-auto space-y-6 relative shadow-2xl">
            <button
              onClick={() => setPolicyType(null)}
              className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors cursor-pointer"
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
                  <p>This Privacy Policy describes how All Care Mint collects, uses, and shares your personal information when you use our public marketing website and our home services marketplace platform.</p>
                  <p><strong>1. Information We Collect</strong><br />We collect personal identifiers such as name, phone number, and city location when you submit forms on our website expressing interest to join as a service partner (Become a Provider form). We collect these to evaluate applicant profiles.</p>
                  <p><strong>2. How We Use Information</strong><br />We use collected provider leads data to verify partner applications, schedule interviews, and establish communication loops. Lead information is saved securely inside the provider_leads database.</p>
                  <p><strong>3. Security Practices</strong><br />We implement server-side validation, cross-site scripting (XSS) input sanitization guards, and SSL encryption. Lead form endpoints are rate-limited to avoid automation spam attacks.</p>
                </>
              ) : (
                <>
                  <p><strong>Last Updated: July 23, 2026</strong></p>
                  <p>Please read these Terms and Conditions carefully before browsing the All Care Mint marketing website or applying to join our network of service partners.</p>
                  <p><strong>1. Acceptance of Terms</strong><br />By browsing our marketing website, you acknowledge that you have read and understood these Terms. Booking services requires the use of our official mobile application client.</p>
                  <p><strong>2. Provider Leads Submissions</strong><br />Submitting interest via the "Become a Provider" form represents a lead registration. It does NOT guarantee onboarding, account creation, or employment contract terms. All applicants go through separate screening loops.</p>
                  <p><strong>3. Intellectual Property</strong><br />All Care Mint logo, design tokens, layout structures, and text materials are owned solely by All Care Mint. Reproduction without written consent is forbidden.</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
