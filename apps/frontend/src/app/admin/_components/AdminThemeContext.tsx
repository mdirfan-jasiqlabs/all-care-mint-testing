'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

export type AdminTheme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

interface AdminThemeContextType {
  theme: AdminTheme;
  resolvedTheme: ResolvedTheme;
  setTheme: (newTheme: AdminTheme) => void;
}

const STORAGE_KEY = 'all-care-mint-admin-theme';

const AdminThemeContext = createContext<AdminThemeContextType | undefined>(undefined);

export function AdminThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<AdminTheme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('dark');
  const [mounted, setMounted] = useState(false);

  // Helper to determine system theme preference
  const getSystemTheme = useCallback((): ResolvedTheme => {
    if (typeof window === 'undefined') return 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }, []);

  // Initialize theme preference from localStorage on mount
  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as AdminTheme | null;
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setThemeState(stored);
      } else {
        setThemeState('system');
      }
    } catch {
      setThemeState('system');
    }
  }, []);

  // Update resolvedTheme and document attribute whenever theme or OS scheme changes
  useEffect(() => {
    if (!mounted) return;

    const computeResolved = (activeTheme: AdminTheme): ResolvedTheme => {
      if (activeTheme === 'system') {
        return getSystemTheme();
      }
      return activeTheme;
    };

    const currentResolved = computeResolved(theme);
    setResolvedTheme(currentResolved);

    // Apply data-admin-theme attribute to html root element
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-admin-theme', currentResolved);
    }

    // Media query listener for live OS preference changes
    if (theme === 'system' && typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleSystemChange = (e: MediaQueryListEvent) => {
        const newResolved = e.matches ? 'dark' : 'light';
        setResolvedTheme(newResolved);
        if (typeof document !== 'undefined') {
          document.documentElement.setAttribute('data-admin-theme', newResolved);
        }
      };

      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleSystemChange);
        return () => mediaQuery.removeEventListener('change', handleSystemChange);
      } else {
        mediaQuery.addListener(handleSystemChange);
        return () => mediaQuery.removeListener(handleSystemChange);
      }
    }
  }, [theme, mounted, getSystemTheme]);

  const setTheme = useCallback((newTheme: AdminTheme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(STORAGE_KEY, newTheme);
    } catch (err) {
      console.error('Failed to persist theme preference:', err);
    }
  }, []);

  return (
    <AdminThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </AdminThemeContext.Provider>
  );
}

export function useAdminTheme() {
  const context = useContext(AdminThemeContext);
  if (!context) {
    throw new Error('useAdminTheme must be used within an AdminThemeProvider');
  }
  return context;
}
