'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function BecomeAProviderPage() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [interest, setInterest] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formAlert, setFormAlert] = useState<{ type: 'success' | 'error' | 'rate-limit'; message: string } | null>(null);
  const [formErrors, setFormErrors] = useState<{ name?: boolean; phone?: boolean; city?: boolean; interest?: boolean }>({});

  const handleSubmit = async (e: React.FormEvent) => {
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

    if (Object.keys(errors).length > 0) return;

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
          message: 'Rate Limited: Maximum 5 lead submissions allowed per hour.',
        });
        return;
      }

      if (!res.ok || !json?.success) {
        throw new Error(json?.message || json?.error?.message || 'Failed to submit application lead.');
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
    } catch (err: any) {
      setFormAlert({
        type: 'error',
        message: err.message || 'An error occurred while submitting your application.',
      });
    } finally {
      setSubmitting(false);
    }
  };

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
          <Link href="/become-a-provider" className="text-white hover:text-emerald-400 transition-colors">Become a Provider</Link>
          <Link href="/contact" className="text-slate-300 hover:text-white transition-colors">Contact</Link>
        </div>
        <Link href="/#download" className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold px-5 py-2 rounded-lg text-xs transition-all shadow-md shadow-emerald-500/10">
          Download App
        </Link>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-16 space-y-8 flex-1">
        <div className="text-center space-y-3">
          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs px-4 py-1.5 rounded-full uppercase tracking-wider font-bold">
            PG-WEB-005 • Partner Onboarding Lead
          </span>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white">Become an All Care Mint Partner</h1>
          <p className="text-slate-400 text-xs md:text-sm max-w-lg mx-auto">
            Set your own hours, earn weekly payouts, and grow your service business with guaranteed local job assignments.
          </p>
        </div>

        <div className="bg-slate-900/30 border border-slate-900 p-8 rounded-3xl relative">
          {formAlert && (
            <div
              className={`mb-6 p-4 rounded-xl text-xs flex justify-between items-center ${
                formAlert.type === 'success'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}
            >
              <span>{formAlert.message}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
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
