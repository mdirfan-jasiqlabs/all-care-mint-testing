'use client';

import React, { useState } from 'react';
import FormInput from '../ui/FormInput';
import FormSelect from '../ui/FormSelect';
import FormTextarea from '../ui/FormTextarea';

interface PartnerLeadSectionProps {
  onShowToast?: (title: string, desc: string, icon?: string) => void;
}

export const PartnerLeadSection: React.FC<PartnerLeadSectionProps> = ({ onShowToast }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [trade, setTrade] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<{
    name?: string;
    phone?: string;
    city?: string;
    trade?: string;
  }>({});
  const [formAlert, setFormAlert] = useState<{
    type: 'success' | 'error' | 'rate-limit';
    message: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormAlert(null);
    const errors: { name?: string; phone?: string; city?: string; trade?: string } = {};

    const cleanName = name.trim();
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    const cleanCity = city.trim();

    if (!cleanName) errors.name = 'Full Name is required.';
    if (!cleanPhone || cleanPhone.length !== 10 || !/^[6-9][0-9]{9}$/.test(cleanPhone)) {
      errors.phone = 'Enter valid 10-digit Indian mobile number.';
    }
    if (!cleanCity) errors.city = 'City / Service Area is required.';
    if (!trade) errors.trade = 'Please select a primary trade skill.';

    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      if (onShowToast) {
        onShowToast('Validation Error', 'Please fill in all required fields correctly.', '❌');
      }
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
          serviceType: trade,
          message: notes,
        }),
      });

      const json = await res.json().catch(() => null);

      if (res.status === 429) {
        setFormAlert({
          type: 'rate-limit',
          message: 'Rate Limited: Maximum 5 submissions per hour allowed. Please try again later.',
        });
        return;
      }

      if (!res.ok || !json?.success) {
        throw new Error(json?.message || json?.error?.message || 'Failed to submit lead request.');
      }

      setFormAlert({
        type: 'success',
        message: 'Thank you! Your application has been recorded. Our partner team will reach out shortly.',
      });
      setName('');
      setPhone('');
      setCity('');
      setTrade('');
      setNotes('');
      if (onShowToast) {
        onShowToast('Lead Recorded', 'Provider application lead submitted successfully.', '✅');
      }
    } catch (err: any) {
      setFormAlert({
        type: 'error',
        message: err.message || 'An error occurred while submitting your application.',
      });
      if (onShowToast) {
        onShowToast('Submission Error', err.message || 'Failed to submit application lead.', '❌');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const tradeOptions = [
    { value: '', label: '-- Select Service Trade --' },
    { value: 'Plumbing', label: 'Plumbing & Pipelines' },
    { value: 'Electrical', label: 'Electrical Work' },
    { value: 'Cleaning', label: 'Cleaning & Sanitization' },
    { value: 'Appliance', label: 'AC & Appliance Repair' },
    { value: 'Painting', label: 'Home Painting Services' },
    { value: 'Other', label: 'Other Skilled Service' },
  ];

  return (
    <section id="partner" aria-labelledby="partner-heading" className="py-2 sm:py-4 px-3 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      {/* OUTER GLASS CARD CONTAINER */}
      <div className="group relative bg-[#060c18]/90 border border-[#14263b] rounded-3xl p-4 sm:p-6 backdrop-blur-xl shadow-2xl space-y-5 overflow-hidden">
        
        {/* Top-Left Decorative 5x4 Dot Grid Pattern */}
        <div className="absolute top-6 left-6 grid grid-cols-5 gap-1.5 opacity-20 pointer-events-none" aria-hidden="true">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="w-1 h-1 rounded-full bg-emerald-400" />
          ))}
        </div>

        {/* Top-Right Decorative 5x4 Dot Grid Pattern */}
        <div className="absolute top-6 right-6 grid grid-cols-5 gap-1.5 opacity-20 pointer-events-none" aria-hidden="true">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="w-1 h-1 rounded-full bg-emerald-400" />
          ))}
        </div>

        {/* SECTION HEADER */}
        <div className="text-center space-y-3 max-w-2xl mx-auto relative z-10">
          {/* Top Glass Pill Badge */}
          <div className="inline-flex items-center space-x-2 bg-[#04141c]/95 border border-emerald-500/40 px-4 py-1.5 rounded-full backdrop-blur-md shadow-[0_0_18px_rgba(16,185,129,0.18)] text-emerald-400 text-xs font-bold uppercase tracking-wider">
            {/* Person with Check Icon */}
            <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>PARTNER LEAD FORM</span>
          </div>

          {/* Heading */}
          <h2 id="partner-heading" className="text-2xl sm:text-4xl font-extrabold text-white leading-tight tracking-tight">
            Join As A <span className="text-emerald-400 font-extrabold">Service Partner</span>
          </h2>

          {/* Subtitle (2 Lines) */}
          <div className="text-slate-300 text-xs sm:text-sm leading-relaxed font-normal space-y-0.5">
            <p>Are you a skilled electrician, plumber, or appliance technician?</p>
            <p>Register your interest below to receive client bookings.</p>
          </div>
        </div>

        {/* Form Alert Message */}
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

        {/* LEAD FORM */}
        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
            
            {/* Field 1: Full Name */}
            <FormInput
              label="FULL NAME"
              required
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rahul Sharma"
              error={formErrors.name}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              }
            />

            {/* Field 2: 10-Digit Mobile Phone */}
            <FormInput
              label="10-DIGIT MOBILE PHONE"
              required
              type="tel"
              maxLength={10}
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
              placeholder="e.g. 9876543210"
              error={formErrors.phone}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              }
            />

            {/* Field 3: City / Primary Service Area */}
            <FormInput
              label="CITY / PRIMARY SERVICE AREA"
              required
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Indore / Bengaluru"
              error={formErrors.city}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              }
            />

            {/* Field 4: Primary Trade / Skill */}
            <FormSelect
              label="PRIMARY TRADE / SKILL"
              required
              value={trade}
              onChange={(e) => setTrade(e.target.value)}
              options={tradeOptions}
              error={formErrors.trade}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              }
            />
          </div>

          {/* Field 5 (Full Width): Additional Notes */}
          <FormTextarea
            label="ADDITIONAL NOTES (OPTIONAL)"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Mention your years of experience, tools owned, or certifications..."
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            }
          />

          {/* Centered Pill Submit Button */}
          <div className="pt-4 flex justify-center w-full">
            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-3 bg-emerald-400 hover:bg-emerald-300 active:scale-95 disabled:opacity-50 text-[#060c18] font-extrabold px-5 sm:px-10 py-3.5 sm:py-4 rounded-full text-xs sm:text-base whitespace-nowrap transition-all duration-200 shadow-[0_4px_25px_rgba(16,185,129,0.35)] hover:shadow-[0_6px_30px_rgba(16,185,129,0.45)] hover:-translate-y-0.5 cursor-pointer text-center"
            >
              {/* Feather/Lucide Send Paper Plane Icon */}
              <svg className="w-5 h-5 text-[#060c18] flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
              <span>{submitting ? 'Submitting Application...' : 'Submit Lead Interest Application'}</span>
            </button>
          </div>
        </form>

        {/* HORIZONTAL DIVIDER LINE */}
        <div className="border-t border-[#14263b] pt-6 relative z-10" />

        {/* BOTTOM TRUST FEATURES ROW (Mobile 1-Column / Tablet 2-Col / Desktop 4-Col) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 relative z-10 text-left">
          
          {/* Trust Item 1: Verified & Trusted */}
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-white leading-tight">Verified & Trusted</h4>
              <p className="text-[11px] text-slate-400 font-medium">We verify every partner</p>
            </div>
          </div>

          {/* Trust Item 2: Steady Bookings */}
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-white leading-tight">Steady Bookings</h4>
              <p className="text-[11px] text-slate-400 font-medium">Get regular service requests</p>
            </div>
          </div>

          {/* Trust Item 3: Fair Earnings */}
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-white leading-tight">Fair Earnings</h4>
              <p className="text-[11px] text-slate-400 font-medium">Transparent payout system</p>
            </div>
          </div>

          {/* Trust Item 4: Dedicated Support */}
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0-4V3" />
              </svg>
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-white leading-tight">Dedicated Support</h4>
              <p className="text-[11px] text-slate-400 font-medium">We're here to help you</p>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};

export default PartnerLeadSection;
