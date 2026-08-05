'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface Category {
  id: string;
  name: string;
}

export default function BecomeAProviderPage() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [interest, setInterest] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formAlert, setFormAlert] = useState<{ type: 'error' | 'rate-limit'; message: string } | null>(null);
  const [formErrors, setFormErrors] = useState<{ name?: string; phone?: string }>({});
  const [submittedData, setSubmittedData] = useState<{ name: string; mobile: string } | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState<boolean>(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    setCategoriesLoading(true);
    setCategoriesError(null);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
      const res = await fetch(`${apiBase}/api/v1/catalog/categories`);
      if (!res.ok) {
        throw new Error('Failed to load service categories.');
      }
      const json = await res.json();
      const rawData = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
      setCategories(rawData);
    } catch (err: any) {
      setCategoriesError(err.message || 'Error loading categories');
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setFormAlert(null);
    const errors: { name?: string; phone?: string } = {};

    const cleanName = name.trim();
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    const cleanCity = city.trim();

    if (!cleanName) {
      errors.name = 'Full name is required.';
    }

    if (!cleanPhone || cleanPhone.length !== 10 || !/^[6-9][0-9]{9}$/.test(cleanPhone)) {
      errors.phone = 'Please enter a valid 10-digit mobile number.';
    }

    setFormErrors(errors);

    if (Object.keys(errors).length > 0) return;

    try {
      setSubmitting(true);
      const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
      const payload: Record<string, string> = {
        name: cleanName,
        mobileNumber: cleanPhone,
      };
      if (cleanCity) payload.serviceArea = cleanCity;
      if (interest) payload.serviceType = interest;

      const res = await fetch(`${apiBase}/api/v1/public/provider-leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => null);

      if (res.status === 429) {
        setFormAlert({
          type: 'rate-limit',
          message: 'Rate Limited: Maximum 5 lead submissions allowed per hour.',
        });
        return;
      }

      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || json?.error?.message || 'Failed to submit application lead.');
      }

      setSubmittedData({
        name: cleanName,
        mobile: cleanPhone,
      });
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

      <main className="max-w-3xl mx-auto px-6 py-16 space-y-8 flex-1 w-full">
        <div className="text-center space-y-3">
          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs px-4 py-1.5 rounded-full uppercase tracking-wider font-bold">
            PG-WEB-005 • Partner Onboarding Lead
          </span>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white">Become an All Care Mint Partner</h1>
          <p className="text-slate-400 text-xs md:text-sm max-w-lg mx-auto">
            Set your own hours, earn weekly payouts, and grow your service business with guaranteed local job assignments.
          </p>
        </div>

        <div className="bg-slate-900/30 border border-slate-900 p-8 rounded-3xl relative" aria-live="polite">
          {submittedData ? (
            <div id="success-container" className="text-center py-12 space-y-4">
              <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto text-2xl font-bold border border-emerald-500/30">
                ✓
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-white">Application Received</h2>
              <p id="success-message" className="text-slate-300 text-sm max-w-md mx-auto leading-relaxed">
                Thanks, {submittedData.name}! We&apos;ll review your application and contact you on {submittedData.mobile}.
              </p>
            </div>
          ) : (
            <>
              {formAlert && (
                <div
                  className="mb-6 p-4 rounded-xl text-xs flex justify-between items-center bg-rose-500/10 text-rose-400 border border-rose-500/20"
                  role="alert"
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
                    aria-invalid={!!formErrors.name}
                    aria-describedby={formErrors.name ? "name-error" : undefined}
                    className={`w-full bg-slate-950 border ${formErrors.name ? 'border-rose-500' : 'border-slate-800'} rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-emerald-500`}
                  />
                  {formErrors.name && <span id="name-error" className="text-[10px] text-rose-500 font-mono mt-1 block">{formErrors.name}</span>}
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
                    aria-invalid={!!formErrors.phone}
                    aria-describedby={formErrors.phone ? "phone-error" : undefined}
                    className={`w-full bg-slate-950 border ${formErrors.phone ? 'border-rose-500' : 'border-slate-800'} rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-emerald-500`}
                  />
                  {formErrors.phone && <span id="phone-error" className="text-[10px] text-rose-500 font-mono mt-1 block">{formErrors.phone}</span>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="input-city" className="text-xs text-slate-400 font-medium">City / Area <span className="text-slate-500">(Optional)</span></label>
                    <input
                      type="text"
                      id="input-city"
                      placeholder="e.g. Bhopal"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label htmlFor="input-interest" className="text-xs text-slate-400 font-medium">Service Interest <span className="text-slate-500">(Optional)</span></label>
                      {categoriesError && (
                        <button
                          type="button"
                          onClick={fetchCategories}
                          className="text-[10px] text-emerald-400 hover:underline cursor-pointer"
                        >
                          Retry Loading
                        </button>
                      )}
                    </div>

                    <select
                      id="input-interest"
                      value={interest}
                      onChange={(e) => setInterest(e.target.value)}
                      disabled={categoriesLoading}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-300 outline-none focus:border-emerald-500 cursor-pointer disabled:opacity-50"
                    >
                      {categoriesLoading ? (
                        <option value="">Loading categories...</option>
                      ) : categoriesError ? (
                        <option value="">Failed to load categories</option>
                      ) : categories.length === 0 ? (
                        <option value="">No categories available</option>
                      ) : (
                        <>
                          <option value="">Select Service Category</option>
                          {categories.map((cat) => (
                            <option key={cat.id} value={cat.name}>
                              {cat.name}
                            </option>
                          ))}
                        </>
                      )}
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  id="btn-submit"
                  disabled={submitting}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold py-3.5 rounded-xl text-xs transition-all shadow-lg shadow-emerald-500/10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {submitting && (
                    <svg className="animate-spin h-4 w-4 text-slate-950" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  <span>{submitting ? 'Submitting Application...' : 'Submit Application'}</span>
                </button>
              </form>
            </>
          )}
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
