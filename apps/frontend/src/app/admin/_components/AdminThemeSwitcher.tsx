'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Monitor, Check } from 'lucide-react';
import { useAdminTheme, AdminTheme } from './AdminThemeContext';

export default function AdminThemeSwitcher() {
  const { theme, resolvedTheme, setTheme } = useAdminTheme();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close popover when clicking outside or pressing Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelectTheme = (newTheme: AdminTheme) => {
    setTheme(newTheme);
    setIsOpen(false);
  };

  // Icon for active resolved appearance or system setting
  const renderTriggerIcon = () => {
    if (theme === 'system') {
      return <Monitor className="w-4 h-4 text-emerald-500" />;
    }
    if (theme === 'light') {
      return <Sun className="w-4 h-4 text-amber-500" />;
    }
    return <Moon className="w-4 h-4 text-emerald-400" />;
  };

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      <button
        type="button"
        id="admin-theme-switcher-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Theme selector"
        aria-expanded={isOpen}
        aria-haspopup="true"
        title={`Theme: ${theme.charAt(0).toUpperCase() + theme.slice(1)} (${resolvedTheme})`}
        className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#090d16] dark:bg-[#090d16] light:bg-slate-100 border border-slate-700/40 dark:border-white/10 light:border-slate-200 text-slate-200 hover:text-white dark:hover:text-white light:hover:text-slate-900 cursor-pointer outline-none transition-all shadow-sm active:scale-95 flex-shrink-0"
        style={{
          backgroundColor: 'var(--admin-input-bg)',
          borderColor: 'var(--admin-border)',
          color: 'var(--admin-text-primary)',
        }}
      >
        {renderTriggerIcon()}
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="admin-theme-switcher-btn"
          className="absolute right-0 mt-2 w-44 rounded-xl shadow-2xl z-50 p-1.5 border transition-all"
          style={{
            backgroundColor: 'var(--admin-modal-bg)',
            borderColor: 'var(--admin-border)',
            color: 'var(--admin-text-primary)',
            boxShadow: '0 12px 30px rgba(0, 0, 0, 0.4)',
          }}
        >
          <div
            className="px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider border-b mb-1"
            style={{
              color: 'var(--admin-text-muted)',
              borderColor: 'var(--admin-border)',
            }}
          >
            Appearance
          </div>

          {/* Light Mode Option */}
          <button
            type="button"
            role="menuitem"
            onClick={() => handleSelectTheme('light')}
            className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer text-left ${
              theme === 'light'
                ? 'bg-emerald-500/15 text-emerald-400 font-bold'
                : 'hover:bg-[var(--admin-surface-hover)]'
            }`}
            style={{
              color: theme === 'light' ? '#10b981' : 'var(--admin-text-primary)',
              backgroundColor: theme === 'light' ? 'rgba(16, 185, 129, 0.12)' : undefined,
            }}
          >
            <div className="flex items-center gap-2.5">
              <Sun className="w-4 h-4 text-amber-500" />
              <span>Light</span>
            </div>
            {theme === 'light' && <Check className="w-4 h-4 text-emerald-500" />}
          </button>

          {/* Dark Mode Option */}
          <button
            type="button"
            role="menuitem"
            onClick={() => handleSelectTheme('dark')}
            className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer text-left ${
              theme === 'dark'
                ? 'bg-emerald-500/15 text-emerald-400 font-bold'
                : 'hover:bg-[var(--admin-surface-hover)]'
            }`}
            style={{
              color: theme === 'dark' ? '#10b981' : 'var(--admin-text-primary)',
              backgroundColor: theme === 'dark' ? 'rgba(16, 185, 129, 0.12)' : undefined,
            }}
          >
            <div className="flex items-center gap-2.5">
              <Moon className="w-4 h-4 text-emerald-400" />
              <span>Dark</span>
            </div>
            {theme === 'dark' && <Check className="w-4 h-4 text-emerald-500" />}
          </button>

          {/* System Mode Option */}
          <button
            type="button"
            role="menuitem"
            onClick={() => handleSelectTheme('system')}
            className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer text-left ${
              theme === 'system'
                ? 'bg-emerald-500/15 text-emerald-400 font-bold'
                : 'hover:bg-[var(--admin-surface-hover)]'
            }`}
            style={{
              color: theme === 'system' ? '#10b981' : 'var(--admin-text-primary)',
              backgroundColor: theme === 'system' ? 'rgba(16, 185, 129, 0.12)' : undefined,
            }}
          >
            <div className="flex items-center gap-2.5">
              <Monitor className="w-4 h-4 text-blue-400" />
              <span>System</span>
            </div>
            {theme === 'system' && <Check className="w-4 h-4 text-emerald-500" />}
          </button>
        </div>
      )}
    </div>
  );
}
