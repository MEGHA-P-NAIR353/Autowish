import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'autowish-theme';
const ThemeContext = createContext(null);

const readStoredTheme = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch { /* storage unavailable */ }
  // Existing product default was dark; keep it unless the user chooses otherwise.
  return 'dark';
};

const applyTheme = (theme) => {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;
  root.dataset.theme = theme;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(readStoredTheme);

  useEffect(() => {
    applyTheme(theme);
    try { localStorage.setItem(STORAGE_KEY, theme); } catch { /* ignore */ }
  }, [theme]);

  const setTheme = useCallback((next) => setThemeState(next === 'light' ? 'light' : 'dark'), []);
  const toggleTheme = useCallback(() => setThemeState((t) => (t === 'dark' ? 'light' : 'dark')), []);

  const value = useMemo(
    () => ({ theme, isDark: theme === 'dark', setTheme, toggleTheme }),
    [theme, setTheme, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};

/**
 * Colour palette for charts / canvases that cannot read CSS variables from class names.
 * Values mirror the tokens in index.css.
 */
export const useChartTheme = () => {
  const { isDark } = useTheme();
  return useMemo(() => (isDark ? {
    grid: 'rgba(148, 163, 184, 0.14)',
    axis: '#8392AB',
    text: '#CBD5E1',
    tooltipBg: 'rgba(15, 21, 35, 0.94)',
    tooltipBorder: 'rgba(255, 255, 255, 0.1)',
    tooltipText: '#F1F5F9',
    cursor: 'rgba(255, 255, 255, 0.05)',
    primary: '#6B8CFF',
    secondary: '#9D7BFF',
    success: '#34D399',
    warning: '#FBBF24',
    danger: '#FB7185',
  } : {
    grid: 'rgba(15, 23, 42, 0.08)',
    axis: '#5A687E',
    text: '#334155',
    tooltipBg: 'rgba(255, 255, 255, 0.96)',
    tooltipBorder: 'rgba(15, 23, 42, 0.1)',
    tooltipText: '#0F172A',
    cursor: 'rgba(15, 23, 42, 0.04)',
    primary: '#3B6FEA',
    secondary: '#7C5CE6',
    success: '#059669',
    warning: '#D97706',
    danger: '#E11D48',
  }), [isDark]);
};

export const chartTooltipStyle = (c) => ({
  backgroundColor: c.tooltipBg,
  border: `1px solid ${c.tooltipBorder}`,
  borderRadius: 12,
  color: c.tooltipText,
  boxShadow: '0 12px 32px -12px rgba(0,0,0,0.35)',
  fontSize: 12,
});
