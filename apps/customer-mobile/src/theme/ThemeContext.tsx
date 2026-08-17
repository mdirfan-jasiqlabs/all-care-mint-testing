import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme, Appearance, ColorSchemeName } from 'react-native';
import { ThemePreference, ThemeMode, ThemeColors, darkColors, lightColors } from './colors';
import * as storage from '../utils/storage';

const THEME_STORAGE_KEY = 'all-care-mint-customer-theme';

interface ThemeContextType {
  preference: ThemePreference;
  resolvedTheme: ThemeMode;
  colors: ThemeColors;
  setPreference: (pref: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  preference: 'system',
  resolvedTheme: 'dark',
  colors: darkColors,
  setPreference: () => {},
});

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [deviceScheme, setDeviceScheme] = useState<ColorSchemeName>(systemColorScheme);
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  // Load saved preference on startup
  useEffect(() => {
    const saved = storage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      setPreferenceState(saved);
    }
  }, []);

  // Listen to live system appearance changes
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setDeviceScheme(colorScheme);
    });
    return () => {
      subscription.remove();
    };
  }, []);

  // Sync state if systemColorScheme changes from hook
  useEffect(() => {
    setDeviceScheme(systemColorScheme);
  }, [systemColorScheme]);

  const setPreference = (pref: ThemePreference) => {
    setPreferenceState(pref);
    storage.setItem(THEME_STORAGE_KEY, pref);
  };

  const resolvedTheme: ThemeMode =
    preference === 'system'
      ? deviceScheme === 'light'
        ? 'light'
        : 'dark'
      : preference;

  const colors = resolvedTheme === 'light' ? lightColors : darkColors;

  return (
    <ThemeContext.Provider value={{ preference, resolvedTheme, colors, setPreference }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
