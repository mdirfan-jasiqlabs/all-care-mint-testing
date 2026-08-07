'use client';

import React, { useState } from 'react';
import { siteConfig } from '@/config/site';
import MotionStagger from '@/components/motion/MotionStagger';
import MotionCard from '@/components/motion/MotionCard';

// Inline SVG Icon Helper Components
const MailIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const PhoneIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
  </svg>
);

const BuildingIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);

const HeadsetIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v3a3 3 0 01-3 3z" />
  </svg>
);

const WhatsAppIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
  </svg>
);

const ShieldCheckIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const ClockIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const UsersIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

export default function ContactPage() {
  const [showNotification, setShowNotification] = useState(false);
  const { contactInfo } = siteConfig.footer;

  const supportEmail = contactInfo.email || "support@allcaremint.com";
  const supportPhone = contactInfo.phone || "+91 1800-ALL-CARE";
  const supportAddress = "BKC, Mumbai, Maharashtra";

  const handleWhatsAppClick = () => {
    setShowNotification(true);
    setTimeout(() => {
      window.location.href = `mailto:${supportEmail}?subject=Immediate%20Assistance%20Request`;
    }, 1200);
  };

  return (
    <div className="w-full flex-1 flex flex-col justify-between py-10 sm:py-14 px-4 sm:px-6 lg:px-8 relative overflow-hidden select-none">
      {/* Background Ambient Lighting Glow */}
      <div 
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none -z-10" 
        aria-hidden="true"
      />

      <div className="max-w-6xl mx-auto w-full space-y-12 sm:space-y-16">
        
        {/* SECTION 1 — CONTACT HERO */}
        <section className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-block">
            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs px-4 py-1.5 rounded-full uppercase tracking-widest font-bold">
              SUPPORT & CONTACT
            </span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tight">
            Contact Us
          </h1>
          
          <p className="text-slate-400 text-base sm:text-lg leading-relaxed max-w-xl mx-auto font-normal">
            Have questions about booking services or partner onboarding? We&apos;re here to help.
          </p>
        </section>

        {/* PRIMARY SUPPORT CHANNELS (3 Equal Height Cards) */}
        <section aria-label="Primary Support Channels">
          <MotionStagger className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 items-stretch">
            {/* CARD 1 — EMAIL SUPPORT */}
            <MotionCard className="bg-[#060d19]/90 border border-emerald-500/20 p-8 rounded-2xl sm:rounded-3xl flex flex-col items-center text-center justify-between shadow-lg hover:shadow-mint-glow hover:border-emerald-500/40 transition-all duration-300 group">
              <div className="flex flex-col items-center w-full">
                {/* Circular Outlined Icon */}
                <div className="w-14 h-14 rounded-full border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-5 shadow-[0_0_15px_rgba(16,185,129,0.15)] group-hover:scale-105 group-hover:bg-emerald-500/20 transition-all">
                  <MailIcon className="w-6 h-6" />
                </div>
                
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-2">
                  EMAIL SUPPORT
                </span>
                
                <a
                  href={`mailto:${supportEmail}`}
                  aria-label={`Email All Care Mint support at ${supportEmail}`}
                  className="text-white text-base sm:text-lg font-bold hover:text-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 rounded-md transition-colors cursor-pointer break-all"
                >
                  {supportEmail}
                </a>

                {/* Mint Divider */}
                <div className="w-8 h-[2px] bg-emerald-500/40 rounded-full my-4" aria-hidden="true" />
              </div>

              <p className="text-slate-400 text-sm font-medium">
                Response time within 24 hours
              </p>
            </MotionCard>

            {/* CARD 2 — PHONE SUPPORT */}
            <MotionCard className="bg-[#060d19]/90 border border-emerald-500/20 p-8 rounded-2xl sm:rounded-3xl flex flex-col items-center text-center justify-between shadow-lg hover:shadow-mint-glow hover:border-emerald-500/40 transition-all duration-300 group">
              <div className="flex flex-col items-center w-full">
                {/* Circular Outlined Icon */}
                <div className="w-14 h-14 rounded-full border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-5 shadow-[0_0_15px_rgba(16,185,129,0.15)] group-hover:scale-105 group-hover:bg-emerald-500/20 transition-all">
                  <PhoneIcon className="w-6 h-6" />
                </div>
                
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-2">
                  PHONE SUPPORT
                </span>
                
                <a
                  href="tel:+9118002552273"
                  aria-label={`Call All Care Mint support hotline at ${supportPhone}`}
                  className="text-white text-base sm:text-lg font-bold hover:text-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 rounded-md transition-colors cursor-pointer"
                >
                  {supportPhone}
                </a>

                {/* Mint Divider */}
                <div className="w-8 h-[2px] bg-emerald-500/40 rounded-full my-4" aria-hidden="true" />
              </div>

              <p className="text-slate-400 text-sm font-medium">
                Customer hotline
              </p>
            </MotionCard>

            {/* CARD 3 — HEADQUARTERS */}
            <MotionCard className="bg-[#060d19]/90 border border-emerald-500/20 p-8 rounded-2xl sm:rounded-3xl flex flex-col items-center text-center justify-between shadow-lg hover:shadow-mint-glow hover:border-emerald-500/40 transition-all duration-300 group">
              <div className="flex flex-col items-center w-full">
                {/* Circular Outlined Icon */}
                <div className="w-14 h-14 rounded-full border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-5 shadow-[0_0_15px_rgba(16,185,129,0.15)] group-hover:scale-105 group-hover:bg-emerald-500/20 transition-all">
                  <BuildingIcon className="w-6 h-6" />
                </div>
                
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-2">
                  HEADQUARTERS
                </span>
                
                <p className="text-white text-base sm:text-lg font-bold leading-snug">
                  {supportAddress}
                </p>

                {/* Mint Divider */}
                <div className="w-8 h-[2px] bg-emerald-500/40 rounded-full my-4" aria-hidden="true" />
              </div>

              <p className="text-slate-400 text-sm font-medium">
                Operating Hours: Mon - Sat, 9 AM - 8 PM IST
              </p>
            </MotionCard>
          </MotionStagger>
        </section>

        {/* SECTION 2 — IMMEDIATE ASSISTANCE CTA */}
        <section 
          className="bg-[#060d19]/90 border border-emerald-500/20 rounded-2xl sm:rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-lg relative overflow-hidden"
          aria-label="Immediate Assistance Support"
        >
          {/* Left Group */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start md:items-center text-center sm:text-left gap-4">
            <div className="w-12 h-12 rounded-full border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-center text-emerald-400 flex-shrink-0 shadow-[0_0_12px_rgba(16,185,129,0.15)]">
              <HeadsetIcon className="w-6 h-6" />
            </div>
            
            <div className="space-y-0.5">
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Need immediate assistance?
              </h2>
              <p className="text-slate-400 text-sm font-normal">
                Our support team is ready to assist you.
              </p>
            </div>
          </div>

          {/* Right Group — WhatsApp Outlined Action Button */}
          <div className="w-full sm:w-auto flex flex-col items-center sm:items-end">
            <button
              onClick={handleWhatsAppClick}
              aria-label="Chat on WhatsApp or contact support team"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl border border-emerald-500/50 text-emerald-400 font-semibold text-sm hover:bg-emerald-500/10 hover:border-emerald-400 hover:shadow-mint-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 transition-all cursor-pointer"
            >
              <WhatsAppIcon className="w-5 h-5 text-emerald-400" />
              <span>Chat on WhatsApp</span>
            </button>

            {showNotification && (
              <p className="text-emerald-400 text-xs mt-2 animate-fade-in font-medium">
                WhatsApp offline. Opening Email Support...
              </p>
            )}
          </div>
        </section>

        {/* SECTION 3 — SUPPORT TRUST ROW */}
        <section 
          className="pt-4 border-t border-slate-800/80 max-w-4xl mx-auto"
          aria-label="Support Trust & Availability"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center md:text-left md:divide-x md:divide-slate-800/80">
            
            {/* ITEM 1 */}
            <div className="flex items-center md:items-start justify-center md:justify-start space-x-3 md:pr-4">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 flex-shrink-0 border border-emerald-500/20">
                <ShieldCheckIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-white text-sm font-bold leading-snug">
                  Trusted &amp; Secure
                </h3>
                <p className="text-slate-400 text-xs font-normal mt-0.5">
                  Your data is protected and safe
                </p>
              </div>
            </div>

            {/* ITEM 2 */}
            <div className="flex items-center md:items-start justify-center md:justify-start space-x-3 md:px-6">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 flex-shrink-0 border border-emerald-500/20">
                <ClockIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-white text-sm font-bold leading-snug">
                  24/7 Support
                </h3>
                <p className="text-slate-400 text-xs font-normal mt-0.5">
                  We&apos;re here whenever you need us
                </p>
              </div>
            </div>

            {/* ITEM 3 */}
            <div className="flex items-center md:items-start justify-center md:justify-start space-x-3 md:pl-6">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 flex-shrink-0 border border-emerald-500/20">
                <UsersIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-white text-sm font-bold leading-snug">
                  Customer First
                </h3>
                <p className="text-slate-400 text-xs font-normal mt-0.5">
                  Your satisfaction is our priority
                </p>
              </div>
            </div>

          </div>
        </section>

      </div>

      {/* Decorative 5x5 Dot Matrix Pattern in Corners */}
      <div className="hidden sm:grid absolute bottom-6 left-6 grid-cols-5 gap-1.5 opacity-15 pointer-events-none" aria-hidden="true">
        {Array.from({ length: 25 }).map((_, i) => (
          <div key={i} className="w-1 h-1 rounded-full bg-emerald-400" />
        ))}
      </div>

      <div className="hidden sm:grid absolute bottom-6 right-6 grid-cols-5 gap-1.5 opacity-15 pointer-events-none" aria-hidden="true">
        {Array.from({ length: 25 }).map((_, i) => (
          <div key={i} className="w-1 h-1 rounded-full bg-emerald-400" />
        ))}
      </div>
    </div>
  );
}

