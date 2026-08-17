import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { getThemePreference, setThemePreference, ProviderThemePreference } from '../utils/storage';

export type ProviderResolvedTheme = 'light' | 'dark';

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceSecondary: string;
  surfaceElevated: string;

  card: string;
  border: string;
  borderSubtle: string;

  textPrimary: string;
  textSecondary: string;
  textMuted: string;

  primary: string;
  primaryForeground: string;

  success: string;
  warning: string;
  danger: string;
  info: string;

  inputBackground: string;
  inputBorder: string;
  inputText: string;
  inputPlaceholder: string;

  headerBackground: string;
  tabBackground: string;

  modalBackground: string;
  modalSurface: string;
  backdrop: string;

  skeletonBase: string;
  skeletonHighlight: string;

  statusAssignedBg: string;
  statusAssignedText: string;
  statusAcceptedBg: string;
  statusAcceptedText: string;
  statusOnTheWayBg: string;
  statusOnTheWayText: string;
  statusStartedBg: string;
  statusStartedText: string;
  statusCompletedBg: string;
  statusCompletedText: string;
  statusCancelledBg: string;
  statusCancelledText: string;
}

export const lightColors: ThemeColors = {
  background: '#f8fafc',
  surface: '#ffffff',
  surfaceSecondary: '#f1f5f9',
  surfaceElevated: '#ffffff',

  card: '#ffffff',
  border: '#e2e8f0',
  borderSubtle: '#f1f5f9',

  textPrimary: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#64748b',

  primary: '#10b981',
  primaryForeground: '#ffffff',

  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',

  inputBackground: '#ffffff',
  inputBorder: '#cbd5e1',
  inputText: '#0f172a',
  inputPlaceholder: '#94a3b8',

  headerBackground: '#ffffff',
  tabBackground: '#ffffff',

  modalBackground: 'rgba(15, 23, 42, 0.6)',
  modalSurface: '#ffffff',
  backdrop: 'rgba(0, 0, 0, 0.5)',

  skeletonBase: '#e2e8f0',
  skeletonHighlight: '#cbd5e1',

  statusAssignedBg: 'rgba(59, 130, 246, 0.12)',
  statusAssignedText: '#2563eb',
  statusAcceptedBg: 'rgba(16, 185, 129, 0.12)',
  statusAcceptedText: '#059669',
  statusOnTheWayBg: 'rgba(245, 158, 11, 0.12)',
  statusOnTheWayText: '#d97706',
  statusStartedBg: 'rgba(168, 85, 247, 0.12)',
  statusStartedText: '#9333ea',
  statusCompletedBg: 'rgba(16, 185, 129, 0.16)',
  statusCompletedText: '#059669',
  statusCancelledBg: 'rgba(239, 68, 68, 0.12)',
  statusCancelledText: '#dc2626',
};

export const darkColors: ThemeColors = {
  background: 'hsl(224, 71%, 4%)', // #020617
  surface: 'hsl(222, 47%, 11%)', // #0f172a
  surfaceSecondary: 'hsl(217, 32%, 14%)',
  surfaceElevated: 'hsl(222, 47%, 13%)',

  card: 'hsl(222, 47%, 11%)',
  border: 'hsl(217, 32%, 17%)',
  borderSubtle: 'rgba(255, 255, 255, 0.08)',

  textPrimary: 'hsl(210, 40%, 98%)',
  textSecondary: 'hsl(215, 20%, 65%)',
  textMuted: 'hsl(215, 20%, 55%)',

  primary: 'hsl(150, 84%, 40%)',
  primaryForeground: 'hsl(224, 71%, 4%)',

  success: '#10b981',
  warning: '#fbbf24',
  danger: '#ef4444',
  info: '#3b82f6',

  inputBackground: 'hsl(224, 71%, 4%)',
  inputBorder: 'hsl(217, 32%, 17%)',
  inputText: 'hsl(210, 40%, 98%)',
  inputPlaceholder: 'hsl(215, 20%, 55%)',

  headerBackground: 'hsl(222, 47%, 11%)',
  tabBackground: 'hsl(222, 47%, 11%)',

  modalBackground: 'rgba(0, 0, 0, 0.75)',
  modalSurface: 'hsl(222, 47%, 11%)',
  backdrop: 'rgba(0, 0, 0, 0.7)',

  skeletonBase: 'hsl(217, 32%, 17%)',
  skeletonHighlight: 'hsl(217, 32%, 25%)',

  statusAssignedBg: 'rgba(59, 130, 246, 0.15)',
  statusAssignedText: '#3b82f6',
  statusAcceptedBg: 'rgba(16, 185, 129, 0.15)',
  statusAcceptedText: '#10b981',
  statusOnTheWayBg: 'rgba(251, 191, 36, 0.15)',
  statusOnTheWayText: '#fbbf24',
  statusStartedBg: 'rgba(168, 85, 247, 0.15)',
  statusStartedText: '#a855f7',
  statusCompletedBg: 'rgba(16, 185, 129, 0.2)',
  statusCompletedText: '#10b981',
  statusCancelledBg: 'rgba(239, 68, 68, 0.15)',
  statusCancelledText: '#ef4444',
};

interface ProviderThemeContextType {
  preference: ProviderThemePreference;
  resolvedTheme: ProviderResolvedTheme;
  colors: ThemeColors;
  setPreference: (pref: ProviderThemePreference) => void;
}

const ProviderThemeContext = createContext<ProviderThemeContextType>({
  preference: 'system',
  resolvedTheme: 'dark',
  colors: darkColors,
  setPreference: () => {},
});

export const ProviderThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme(); // 'light' | 'dark' | null | undefined
  const [preference, setPreferenceState] = useState<ProviderThemePreference>('system');

  useEffect(() => {
    const stored = getThemePreference();
    setPreferenceState(stored);
  }, []);

  const setPreference = (pref: ProviderThemePreference) => {
    setPreferenceState(pref);
    setThemePreference(pref);
  };

  const resolvedTheme: ProviderResolvedTheme =
    preference === 'system'
      ? systemColorScheme === 'light'
        ? 'light'
        : 'dark'
      : preference;

  const colors = resolvedTheme === 'dark' ? darkColors : lightColors;

  return (
    <ProviderThemeContext.Provider
      value={{
        preference,
        resolvedTheme,
        colors,
        setPreference,
      }}
    >
      {children}
    </ProviderThemeContext.Provider>
  );
};

export const useProviderTheme = () => useContext(ProviderThemeContext);
