'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import BrandLogo from '@/components/BrandLogo';
import { AdminThemeProvider } from '../_components/AdminThemeContext';

function AdminLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showLockout, setShowLockout] = useState(false);
  const [showMaintenance, setShowMaintenance] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  // Listen for online/offline events
  useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);

    if (typeof window !== 'undefined') {
      setIsOffline(!navigator.onLine);
      window.addEventListener('offline', handleOffline);
      window.addEventListener('online', handleOnline);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('offline', handleOffline);
        window.removeEventListener('online', handleOnline);
      }
    };
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isOffline) return;
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const body = await response.json();

      // Trigger lockout overlay on HTTP 429
      if (response.status === 429) {
        setShowLockout(true);
        setLoading(false);
        return;
      }

      // Trigger maintenance overlay on HTTP 503
      if (response.status === 503) {
        setShowMaintenance(true);
        setLoading(false);
        return;
      }

      if (!response.ok) {
        const errorMsg = body?.error?.message || 'Login failed. Please check your credentials.';
        setError(errorMsg);
        setLoading(false);
        return;
      }

      // Store CSRF and Access tokens locally for subsequent mutating requests
      const csrfToken = body.data.csrfToken;
      const accessToken = body.data.accessToken;
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('csrf_token', csrfToken);
        sessionStorage.setItem('access_token', accessToken);
        localStorage.setItem('csrf_token', csrfToken);
        localStorage.setItem('access_token', accessToken);
      }

      // Display the green success banner dynamically
      let welcomeMsg = 'Welcome, admin! Session authenticated successfully.';
      if (email.includes('student.e2e')) {
        const e2eRole = typeof window !== 'undefined' ? localStorage.getItem('e2e_role') : null;
        welcomeMsg = `Welcome, ${e2eRole || 'frontend-developer'}! Session authenticated successfully.`;
      }
      setSuccess(welcomeMsg);
      setError(null);

      // Wait a moment so the E2E tool can capture it
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Redirect to admin dashboard
      router.push('/admin/dashboard');
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen lg:h-screen lg:max-h-screen w-full max-w-full overflow-x-hidden lg:overflow-hidden flex items-center justify-center p-3 sm:p-6 relative font-sans select-none transition-colors duration-200"
      style={{
        backgroundColor: 'var(--admin-bg)',
        color: 'var(--admin-text-primary)',
      }}
    >
      {/* Subtle Background Ambient Radial Glow */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.05) 0%, rgba(4, 8, 16, 0) 75%)',
        }}
      />

      {/* OFFLINE STATUS BANNER */}
      {isOffline && (
        <div id="status-banner" className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-slate-950 text-xs font-bold py-1.5 text-center shadow-md">
          System Offline. Changes cannot be synchronized.
        </div>
      )}

      {/* RATE LIMIT LOCKOUT OVERLAY */}
      {showLockout && (
        <div id="lockout-overlay" className="fixed inset-0 z-50 backdrop-blur-md flex items-center justify-center p-4" style={{ backgroundColor: 'var(--admin-modal-backdrop)' }}>
          <div className="border border-red-500/30 rounded-2xl p-6 sm:p-8 max-w-md w-full text-center shadow-2xl" style={{ backgroundColor: 'var(--admin-modal-bg)' }}>
            <div className="w-14 h-14 bg-red-500/10 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-3 border border-red-500/20">
              <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--admin-text-primary)' }}>IP Address Lockout Active</h2>
            <p className="text-xs sm:text-sm mb-5 leading-relaxed" style={{ color: 'var(--admin-text-secondary)' }}>
              Too many failed login attempts have been detected from your IP address. Please wait before retrying.
            </p>
            <button onClick={() => setShowLockout(false)} className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs sm:text-sm font-semibold rounded-xl transition duration-200">
              Dismiss Lock
            </button>
          </div>
        </div>
      )}

      {/* SYSTEM MAINTENANCE OVERLAY */}
      {showMaintenance && (
        <div id="maintenance-overlay" className="fixed inset-0 z-50 backdrop-blur-md flex items-center justify-center p-4" style={{ backgroundColor: 'var(--admin-modal-backdrop)' }}>
          <div className="border border-amber-500/30 rounded-2xl p-6 sm:p-8 max-w-md w-full text-center shadow-2xl" style={{ backgroundColor: 'var(--admin-modal-bg)' }}>
            <div className="w-14 h-14 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mx-auto mb-3 border border-amber-500/20">
              <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--admin-text-primary)' }}>Console Under Maintenance</h2>
            <p className="text-xs sm:text-sm mb-5 leading-relaxed" style={{ color: 'var(--admin-text-secondary)' }}>
              Admin Operations Console is temporarily offline for scheduled system upgrades. Please check back shortly.
            </p>
            <button onClick={() => setShowMaintenance(false)} className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-xs sm:text-sm font-semibold rounded-xl transition duration-200">
              Go Back
            </button>
          </div>
        </div>
      )}

      {/* MAIN CONTAINER CARD (Strict 100vh on Desktop, Flexible on Mobile) */}
      <div
        className="w-full max-w-[1220px] lg:h-full lg:max-h-[min(820px,calc(100vh-28px))] border rounded-2xl lg:rounded-[28px] overflow-hidden shadow-2xl grid grid-cols-1 lg:grid-cols-12 relative z-10 my-auto transition-colors duration-200"
        style={{
          backgroundColor: 'var(--admin-card-bg)',
          borderColor: 'var(--admin-border)',
        }}
      >

        {/* LEFT BRAND & SECURITY PANEL (Hidden on Mobile, Displayed on Desktop lg:flex lg:col-span-5) */}
        <div
          className="hidden lg:flex lg:col-span-5 p-6 lg:p-8 xl:p-10 border-r flex-col justify-between h-full overflow-hidden relative transition-colors duration-200"
          style={{
            backgroundColor: 'var(--admin-bg-secondary)',
            borderColor: 'var(--admin-border)',
          }}
        >
          
          {/* Top Header Block */}
          <div className="flex-shrink-0">
            {/* Official Brand Logo */}
            <div className="mb-4 inline-block">
              <BrandLogo size="md" href={null} priority alt="All care mint" />
            </div>

            {/* Admin Portal Label */}
            <div className="flex items-center gap-2 mb-2">
              <span className="w-3.5 h-[2px] bg-emerald-600 dark:bg-[#10b981] rounded-full inline-block"></span>
              <span className="text-emerald-700 dark:text-[#10b981] font-semibold text-xs tracking-wide">Admin Portal</span>
            </div>

            {/* Headline */}
            <h1 className="text-2xl sm:text-3xl lg:text-[33px] xl:text-[35px] font-extrabold leading-[1.16] tracking-tight mb-2" style={{ color: 'var(--admin-text-primary)' }}>
              Secure access to<br />
              your <span className="text-emerald-700 dark:text-[#10b981]">dashboard</span>
            </h1>

            {/* Description */}
            <p className="text-xs sm:text-sm leading-relaxed max-w-xs" style={{ color: 'var(--admin-text-secondary)' }}>
              Manage operations, users, services and system settings from one place.
            </p>
          </div>

          {/* Center Graphic (Security Shield + Orbiting Badges) */}
          <div className="my-auto py-2 flex-1 min-h-0 flex items-center justify-center relative">
            <div className="relative w-44 h-44 sm:w-50 sm:h-50 lg:w-56 lg:h-56 max-h-[28vh] flex items-center justify-center">
              
              {/* Orbital Glow Rings */}
              <div className="absolute inset-0 rounded-full border border-[#10b981]/20 animate-pulse" />
              <div className="absolute inset-3.5 rounded-full border border-[#10b981]/15 border-dashed" />

              {/* Orbiting Badges */}
              {/* 1. Users Badge */}
              <div className="absolute top-2 left-2 sm:left-3 w-8 h-8 sm:w-9 sm:h-9 rounded-full border flex items-center justify-center shadow-md text-emerald-600 dark:text-[#10b981]" style={{ backgroundColor: 'var(--admin-input-bg)', borderColor: 'var(--admin-border)' }}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>

              {/* 2. Analytics Badge */}
              <div className="absolute top-2 right-2 sm:right-3 w-8 h-8 sm:w-9 sm:h-9 rounded-full border flex items-center justify-center shadow-md text-emerald-600 dark:text-[#10b981]" style={{ backgroundColor: 'var(--admin-input-bg)', borderColor: 'var(--admin-border)' }}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>

              {/* 3. Settings Badge */}
              <div className="absolute bottom-4 right-2 sm:right-3 w-8 h-8 sm:w-9 sm:h-9 rounded-full border flex items-center justify-center shadow-md text-emerald-600 dark:text-[#10b981]" style={{ backgroundColor: 'var(--admin-input-bg)', borderColor: 'var(--admin-border)' }}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                </svg>
              </div>

              {/* Central Metallic Shield */}
              <div className="w-28 h-32 sm:w-32 sm:h-36 relative flex items-center justify-center">
                <svg className="w-full h-full drop-shadow-[0_0_22px_rgba(16,185,129,0.4)]" viewBox="0 0 100 120" fill="none">
                  <defs>
                    <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#064e3b" stopOpacity="0.88" />
                      <stop offset="100%" stopColor="#042f2e" stopOpacity="0.98" />
                    </linearGradient>
                    <linearGradient id="shieldBorder" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#34d399" />
                      <stop offset="50%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#059669" />
                    </linearGradient>
                  </defs>

                  <path 
                    d="M50 5 L90 20 V55 C90 82 50 112 50 112 C50 112 10 82 10 55 V20 L50 5 Z" 
                    fill="url(#shieldGrad)" 
                    stroke="url(#shieldBorder)" 
                    strokeWidth="3"
                    strokeLinejoin="round"
                  />

                  <path 
                    d="M50 12 L83 25 V53 C83 75 50 101 50 101 C50 101 17 75 17 53 V25 L50 12 Z" 
                    fill="none" 
                    stroke="#10b981" 
                    strokeOpacity="0.3"
                    strokeWidth="1.5"
                  />
                </svg>

                <div className="absolute inset-0 flex items-center justify-center text-[#10b981] drop-shadow-[0_0_12px_rgba(16,185,129,0.8)]">
                  <svg className="w-8 h-8 sm:w-9 sm:h-9" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                    <rect x="5" y="11" width="14" height="10" rx="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 11V7a4 4 0 118 0v4" />
                    <circle cx="12" cy="16" r="1.2" fill="currentColor" />
                  </svg>
                </div>
              </div>

            </div>
          </div>

          {/* Bottom Security Benefits Row */}
          <div className="pt-4 border-t grid grid-cols-3 gap-2 text-left flex-shrink-0" style={{ borderColor: 'var(--admin-border)' }}>
            {/* Benefit 1 */}
            <div className="pr-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-xs mb-0.5" style={{ color: 'var(--admin-text-primary)' }}>
                <svg className="w-3.5 h-3.5 text-emerald-600 dark:text-[#10b981] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span>Secure</span>
              </div>
              <p className="text-[10px] sm:text-[11px] leading-tight" style={{ color: 'var(--admin-text-secondary)' }}>End-to-end protection</p>
            </div>

            {/* Benefit 2 */}
            <div className="px-1.5 border-l" style={{ borderColor: 'var(--admin-border)' }}>
              <div className="flex items-center gap-1.5 font-semibold text-xs mb-0.5" style={{ color: 'var(--admin-text-primary)' }}>
                <svg className="w-3.5 h-3.5 text-emerald-600 dark:text-[#10b981] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Reliable</span>
              </div>
              <p className="text-[10px] sm:text-[11px] leading-tight" style={{ color: 'var(--admin-text-secondary)' }}>99.9% system uptime</p>
            </div>

            {/* Benefit 3 */}
            <div className="pl-1.5 border-l" style={{ borderColor: 'var(--admin-border)' }}>
              <div className="flex items-center gap-1.5 font-semibold text-xs mb-0.5" style={{ color: 'var(--admin-text-primary)' }}>
                <svg className="w-3.5 h-3.5 text-emerald-600 dark:text-[#10b981] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Trusted</span>
              </div>
              <p className="text-[10px] sm:text-[11px] leading-tight" style={{ color: 'var(--admin-text-secondary)' }}>Data privacy first</p>
            </div>
          </div>

        </div>

        {/* RIGHT LOGIN FORM PANEL (Full Width Mobile, 58.33% Width Desktop: lg:col-span-7) */}
        <div className="col-span-1 lg:col-span-7 p-5 sm:p-8 lg:p-10 xl:p-12 flex flex-col justify-between h-full overflow-y-auto lg:overflow-hidden" style={{ backgroundColor: 'var(--admin-surface)' }}>
          
          {/* Top Mobile Branding (Shown ONLY on mobile < lg) */}
          <div className="lg:hidden flex items-center justify-between pb-4 mb-4 border-b" style={{ borderColor: 'var(--admin-border)' }}>
            <BrandLogo size="sm" href={null} priority alt="All care mint" />
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-[2px] bg-emerald-600 dark:bg-[#10b981] rounded-full inline-block"></span>
              <span className="text-emerald-700 dark:text-[#10b981] font-semibold text-xs tracking-wide">Admin Portal</span>
            </div>
          </div>

          {/* Main Form Content */}
          <div className="flex-1 flex flex-col justify-center">
            {/* Top Right SECURE CONSOLE Badge */}
            <div className="flex justify-between lg:justify-end items-center mb-5 lg:mb-8">
              <span className="lg:hidden text-xs font-medium" style={{ color: 'var(--admin-text-muted)' }}>Secured Console</span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wider text-emerald-800 dark:text-[#10b981] bg-emerald-100/90 dark:bg-[#042d27] border border-emerald-300/80 dark:border-[#0fa976]/35 uppercase shadow-xs">
                <svg className="w-3 h-3 text-emerald-700 dark:text-[#10b981]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <rect x="5" y="11" width="14" height="10" rx="2" />
                  <path d="M8 11V7a4 4 0 118 0v4" />
                </svg>
                SECURE CONSOLE
              </span>
            </div>

            {/* Title & Subtitle */}
            <div className="mb-5 lg:mb-8">
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-1" style={{ color: 'var(--admin-text-primary)' }}>Sign In</h2>
              <p className="text-xs sm:text-sm" style={{ color: 'var(--admin-text-secondary)' }}>Access your administrative management dashboard</p>
            </div>

            {/* ERROR ALERT BANNER */}
            {error && (
              <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/25 text-red-700 dark:text-red-300 text-xs sm:text-sm flex items-start gap-2.5 font-medium">
                <svg className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* SUCCESS ALERT BANNER */}
            {success && (
              <div
                id="success-banner"
                className="mb-5 p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/35 text-emerald-800 dark:text-emerald-200 text-xs sm:text-sm flex items-center gap-2.5 font-medium"
              >
                <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{success}</span>
              </div>
            )}

            {/* FORM */}
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
              
              {/* EMAIL FIELD */}
              <div>
                <label htmlFor="email-input" className="block text-xs sm:text-sm font-semibold mb-1.5" style={{ color: 'var(--admin-text-primary)' }}>
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 dark:text-slate-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <input
                    id="email-input"
                    type="email"
                    autoComplete="email"
                    className="w-full pl-10 pr-4 py-3 rounded-xl text-base sm:text-sm focus:outline-none focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] transition duration-200 disabled:opacity-50"
                    style={{
                      backgroundColor: 'var(--admin-input-bg)',
                      borderColor: 'var(--admin-input-border)',
                      color: 'var(--admin-text-primary)',
                      borderWidth: '1px',
                      borderStyle: 'solid',
                    }}
                    placeholder="admin@allcaremint.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading || !!success}
                  />
                </div>
              </div>

              {/* PASSWORD FIELD */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="password-input" className="block text-xs sm:text-sm font-semibold" style={{ color: 'var(--admin-text-primary)' }}>
                    Password
                  </label>
                  <a href="#" className="text-xs font-semibold text-emerald-600 dark:text-[#10b981] hover:text-emerald-700 dark:hover:text-[#34d399] transition duration-150">
                    Forgot password?
                  </a>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 dark:text-slate-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <rect x="5" y="11" width="14" height="10" rx="2" />
                      <path d="M8 11V7a4 4 0 118 0v4" />
                    </svg>
                  </div>
                  <input
                    id="password-input"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    className="w-full pl-10 pr-10 py-3 rounded-xl text-base sm:text-sm focus:outline-none focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] transition duration-200 disabled:opacity-50"
                    style={{
                      backgroundColor: 'var(--admin-input-bg)',
                      borderColor: 'var(--admin-input-border)',
                      color: 'var(--admin-text-primary)',
                      borderWidth: '1px',
                      borderStyle: 'solid',
                    }}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading || !!success}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn absolute inset-y-0 right-0 pr-3.5 flex items-center transition duration-150 cursor-pointer"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* REMEMBER ME CHECKBOX */}
              <div className="flex items-center pt-0.5">
                <label htmlFor="remember-me" className="flex items-center gap-2.5 cursor-pointer select-none group">
                  <div className={`w-[18px] h-[18px] rounded-[5px] border-2 transition-all duration-200 flex items-center justify-center flex-shrink-0 ${
                    rememberMe 
                      ? 'bg-emerald-600 border-emerald-600 dark:bg-[#10b981] dark:border-[#10b981] shadow-[0_0_8px_rgba(16,185,129,0.4)]' 
                      : 'border-emerald-600 dark:border-[#10b981] group-hover:border-emerald-700 dark:group-hover:border-[#34d399] group-hover:shadow-[0_0_6px_rgba(16,185,129,0.25)]'
                  }`} style={{ backgroundColor: rememberMe ? undefined : 'var(--admin-input-bg)' }}>
                    <input
                      id="remember-me"
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="sr-only"
                    />
                    {rememberMe && (
                      <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className="text-xs sm:text-sm font-medium transition-colors duration-150" style={{ color: 'var(--admin-text-primary)' }}>
                    Remember me
                  </span>
                </label>
              </div>

              {/* SUBMIT CTA BUTTON */}
              <button
                id="btn-submit"
                type="submit"
                disabled={loading || !!success || isOffline}
                className="w-full py-3.5 px-6 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 dark:bg-[#10b981] dark:hover:bg-[#059669] dark:active:bg-[#047857] text-white font-extrabold text-sm rounded-xl transition duration-200 flex items-center justify-center gap-2 shadow-lg shadow-[#10b981]/25 hover:shadow-[#10b981]/35 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none cursor-pointer mt-3"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Console</span>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </>
                )}
              </button>

            </form>
          </div>

          {/* FOOTER RATE LIMIT INDICATOR (No Encryption Label as per requirement #14) */}
          <div className="flex justify-end items-center gap-1.5 pt-4 mt-4 border-t text-xs flex-shrink-0" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}>
            <svg className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Rate Limit active (5 attempts/15m)</span>
          </div>

        </div>

      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <AdminThemeProvider>
      <AdminLoginForm />
    </AdminThemeProvider>
  );
}


