export type ThemeMode = 'light' | 'dark';
export type ThemePreference = 'light' | 'dark' | 'system';

export interface ThemeColors {
  background: string;
  card: string;
  cardBorder: string;
  surfaceSecondary: string;

  textPrimary: string;
  textSecondary: string;
  textMuted: string;

  border: string;
  borderSubtle: string;

  primary: string;
  primaryForeground: string;

  inputBackground: string;
  inputBorder: string;
  inputText: string;
  placeholderText: string;

  success: string;
  warning: string;
  danger: string;
  info: string;

  headerBackground: string;
  headerBorder: string;
  headerText: string;

  navBackground: string;
  navBorder: string;
  tabActive: string;
  tabInactive: string;
  tabActiveBg: string;

  modalBackground: string;
  backdrop: string;

  skeletonBase: string;
  skeletonHighlight: string;

  badgeBg: string;
  badgeText: string;

  isDark: boolean;
}

export const darkColors: ThemeColors = {
  background: '#060b13',
  card: '#0d1527',
  cardBorder: '#1e293b',
  surfaceSecondary: '#131b2e',

  textPrimary: '#ffffff',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',

  border: '#1e293b',
  borderSubtle: '#131b2e',

  primary: '#10b981',
  primaryForeground: '#060b13',

  inputBackground: '#0f172a',
  inputBorder: '#1e293b',
  inputText: '#ffffff',
  placeholderText: '#64748b',

  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',

  headerBackground: '#0d1527',
  headerBorder: '#1e293b',
  headerText: '#ffffff',

  navBackground: '#090d16',
  navBorder: '#1c2638',
  tabActive: '#10b981',
  tabInactive: '#94a3b8',
  tabActiveBg: 'rgba(16, 185, 129, 0.12)',

  modalBackground: '#0d1527',
  backdrop: 'rgba(0, 0, 0, 0.75)',

  skeletonBase: 'rgba(255, 255, 255, 0.08)',
  skeletonHighlight: 'rgba(255, 255, 255, 0.15)',

  badgeBg: 'rgba(16, 185, 129, 0.12)',
  badgeText: '#10b981',

  isDark: true,
};

export const lightColors: ThemeColors = {
  background: '#f8fafc',
  card: '#ffffff',
  cardBorder: '#e2e8f0',
  surfaceSecondary: '#f1f5f9',

  textPrimary: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#64748b',

  border: '#e2e8f0',
  borderSubtle: '#f1f5f9',

  primary: '#10b981',
  primaryForeground: '#ffffff',

  inputBackground: '#ffffff',
  inputBorder: '#cbd5e1',
  inputText: '#0f172a',
  placeholderText: '#94a3b8',

  success: '#10b981',
  warning: '#d97706',
  danger: '#ef4444',
  info: '#2563eb',

  headerBackground: '#ffffff',
  headerBorder: '#e2e8f0',
  headerText: '#0f172a',

  navBackground: '#ffffff',
  navBorder: '#e2e8f0',
  tabActive: '#059669',
  tabInactive: '#64748b',
  tabActiveBg: 'rgba(16, 185, 129, 0.12)',

  modalBackground: '#ffffff',
  backdrop: 'rgba(15, 23, 42, 0.5)',

  skeletonBase: '#e2e8f0',
  skeletonHighlight: '#cbd5e1',

  badgeBg: 'rgba(16, 185, 129, 0.12)',
  badgeText: '#059669',

  isDark: false,
};
