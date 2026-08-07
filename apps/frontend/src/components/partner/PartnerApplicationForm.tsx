'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface Category {
  id: string;
  name: string;
}

export default function PartnerApplicationForm() {
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
    <div className="w-full bg-[#080d1a]/95 border border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/80 backdrop-blur-xl relative">
      {submittedData ? (
        <div id="success-container" className="text-center py-10 space-y-4">
          <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto text-2xl font-extrabold border border-emerald-500/40 shadow-lg shadow-emerald-500/20">
            ✓
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Application Received</h2>
          <p id="success-message" className="text-slate-300 text-xs sm:text-sm max-w-md mx-auto leading-relaxed font-medium">
            Thanks, <span className="text-emerald-400 font-bold">{submittedData.name}</span>! We&apos;ll review your application and contact you on <span className="text-emerald-400 font-bold">{submittedData.mobile}</span>.
          </p>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="flex items-center space-x-3.5 mb-6">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center flex-shrink-0 shadow-inner">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 00-3.741-.479 3 3 0 00-3.518 0A9.094 9.094 0 007 18.72M15 9a3 3 0 11-6 0 3 3 0 016 0zm6 3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Partner Application
              </h2>
              <p className="text-slate-400 text-xs font-medium">
                Fill in your details to get started
              </p>
            </div>
          </div>

          {formAlert && (
            <div
              className="mb-5 p-3.5 rounded-xl text-xs flex justify-between items-center bg-rose-500/10 text-rose-400 border border-rose-500/20 font-medium"
              role="alert"
            >
              <span>{formAlert.message}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Full Name */}
            <div className="space-y-1.5">
              <label htmlFor="input-name" className="block text-xs font-semibold text-slate-300">
                Full Name <span className="text-emerald-400">*</span>
              </label>
              <input
                type="text"
                id="input-name"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-invalid={!!formErrors.name}
                aria-describedby={formErrors.name ? 'name-error' : undefined}
                className={`w-full bg-[#040711] border ${
                  formErrors.name ? 'border-rose-500 focus:ring-rose-500/30' : 'border-slate-800 focus:border-emerald-400 focus:ring-emerald-400/30'
                } rounded-xl px-4 py-3 text-xs sm:text-sm text-white placeholder-slate-500 outline-none focus:ring-2 transition-all font-medium`}
              />
              {formErrors.name && (
                <span id="name-error" className="text-[11px] text-rose-400 font-medium mt-1 block">
                  {formErrors.name}
                </span>
              )}
            </div>

            {/* Mobile Number */}
            <div className="space-y-1.5">
              <label htmlFor="input-phone" className="block text-xs font-semibold text-slate-300">
                Mobile Number (10-Digit) <span className="text-emerald-400">*</span>
              </label>
              <input
                type="tel"
                id="input-phone"
                maxLength={10}
                placeholder="Enter your 10-digit mobile number"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                aria-invalid={!!formErrors.phone}
                aria-describedby={formErrors.phone ? 'phone-error' : undefined}
                className={`w-full bg-[#040711] border ${
                  formErrors.phone ? 'border-rose-500 focus:ring-rose-500/30' : 'border-slate-800 focus:border-emerald-400 focus:ring-emerald-400/30'
                } rounded-xl px-4 py-3 text-xs sm:text-sm text-white placeholder-slate-500 outline-none focus:ring-2 transition-all font-medium`}
              />
              {formErrors.phone && (
                <span id="phone-error" className="text-[11px] text-rose-400 font-medium mt-1 block">
                  {formErrors.phone}
                </span>
              )}
            </div>

            {/* City & Service Interest (2 Columns) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="input-city" className="block text-xs font-semibold text-slate-300">
                  City / Area <span className="text-slate-500 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  id="input-city"
                  placeholder="e.g. Bhopal"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full bg-[#040711] border border-slate-800 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30 rounded-xl px-4 py-3 text-xs sm:text-sm text-white placeholder-slate-500 outline-none transition-all font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label htmlFor="input-interest" className="block text-xs font-semibold text-slate-300">
                    Service Interest <span className="text-slate-500 font-normal">(Optional)</span>
                  </label>
                  {categoriesError && (
                    <button
                      type="button"
                      onClick={fetchCategories}
                      className="text-[10px] text-emerald-400 hover:underline cursor-pointer font-semibold"
                    >
                      Retry
                    </button>
                  )}
                </div>

                <div className="relative">
                  <select
                    id="input-interest"
                    value={interest}
                    onChange={(e) => setInterest(e.target.value)}
                    disabled={categoriesLoading}
                    className="w-full bg-[#040711] border border-slate-800 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30 rounded-xl px-4 py-3 text-xs sm:text-sm text-slate-200 outline-none transition-all font-medium cursor-pointer disabled:opacity-50 appearance-none pr-10"
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
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              id="btn-submit"
              disabled={submitting}
              className="w-full bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black py-3.5 px-6 rounded-xl text-xs sm:text-sm transition-all shadow-lg shadow-emerald-500/20 hover:scale-[1.01] active:scale-[0.99] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 mt-2"
            >
              {submitting && (
                <svg className="animate-spin h-4 w-4 text-slate-950" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              <span>{submitting ? 'Submitting Application...' : 'Submit Application'}</span>
              {!submitting && (
                <svg className="w-4 h-4 text-slate-950 font-bold" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              )}
            </button>

            {/* Trust Footer Message */}
            <div className="flex items-center justify-center space-x-2 text-[11px] sm:text-xs text-slate-400 pt-2 font-medium">
              <svg className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
              <span>Your information is safe and secure</span>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
