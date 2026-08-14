'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import BrandLogo from '@/components/BrandLogo';
import { LogOut, Menu } from 'lucide-react';
import { motion } from 'framer-motion';

interface AdminHeaderProps {
  onMenuClick?: () => void;
}

export default function AdminHeader({ onMenuClick }: AdminHeaderProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [csrfToken, setCsrfToken] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = sessionStorage.getItem('csrf_token') || localStorage.getItem('csrf_token') || '';
      setCsrfToken(token);
    }
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
      });
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('csrf_token');
        sessionStorage.removeItem('access_token');
        localStorage.removeItem('csrf_token');
        localStorage.removeItem('access_token');
      }
      router.push('/login/admin');
    } catch (err) {
      console.error('Logout error:', err);
      setLoggingOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 w-full h-16 sm:h-[72px] px-3 sm:px-6 bg-[#060b13]/95 backdrop-blur-md border-b border-white/[0.06] flex items-center justify-between box-border">
      {/* Left side: Brand Logo only */}
      <div className="flex items-center gap-2 min-w-0">
        <BrandLogo href="/admin/dashboard" size="sm" className="sm:hidden" alt="All care mint Admin" />
        <BrandLogo href="/admin/dashboard" size="md" className="hidden sm:block" alt="All care mint Admin" />
      </div>

      {/* Right side: Hamburger on Mobile (< lg), Log Out on Desktop (>= lg) */}
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        {/* Animated Hamburger Toggle Button: ONLY visible on screens < 1024px (lg:hidden) */}
        <motion.button
          type="button"
          onClick={onMenuClick}
          aria-label="Open menu"
          title="Open menu"
          whileHover={{ scale: 1.05, backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
          whileTap={{ scale: 0.88, rotate: -90, transition: { duration: 0.15 } }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="flex lg:hidden items-center justify-center w-10 h-10 rounded-xl bg-white/[0.05] border border-white/10 text-slate-200 hover:text-white cursor-pointer outline-none flex-shrink-0"
        >
          <Menu className="w-5 h-5 text-slate-200" />
        </motion.button>

        {/* Desktop Log Out Button: ONLY visible on screens >= 1024px */}
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          aria-label="Log out"
          title="Log out"
          className="hidden lg:inline-flex h-10 px-4 rounded-xl text-xs font-bold transition-all items-center justify-center gap-2 bg-red-500/10 border border-red-500/25 text-red-400 hover:bg-red-500/20 hover:border-red-500/40 hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed outline-none flex-shrink-0 shadow-sm active:scale-95 cursor-pointer"
        >
          {loggingOut ? (
            <span className="w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin inline-block" />
          ) : (
            <LogOut className="w-4 h-4 text-red-400" />
          )}
          <span>Log Out</span>
        </button>
      </div>
    </header>
  );
}


