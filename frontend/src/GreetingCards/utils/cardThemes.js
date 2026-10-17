/**
 * AutoWish AI - Canonical Card Theme Definitions
 * 
 * Shared across:
 * - Minimal Card Creator
 * - Full Card Editor (CardEditor / GreetingWizard)
 * - GreetingCardRenderer
 * - Export utilities
 */

export const CARD_THEMES = [
  {
    key: 'midnight',
    name: 'Midnight Indigo',
    bg: '#0F172A',
    gradient: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 100%)',
    textColor: '#FFFFFF',
    accentColor: '#818CF8',
    borderColor: 'rgba(129, 140, 248, 0.4)',
    decor: 'stars',
    isDark: true,
  },
  {
    key: 'champagne',
    name: 'Champagne Gold',
    bg: '#1A1612',
    gradient: 'linear-gradient(135deg, #1C1917 0%, #292014 100%)',
    textColor: '#FEF3C7',
    accentColor: '#F59E0B',
    borderColor: 'rgba(245, 158, 11, 0.4)',
    decor: 'sparkles',
    isDark: true,
  },
  {
    key: 'velvet',
    name: 'Celebration Velvet',
    bg: '#2E1065',
    gradient: 'linear-gradient(135deg, #2E1065 0%, #3B0764 100%)',
    textColor: '#FAF5FF',
    accentColor: '#D946EF',
    borderColor: 'rgba(217, 70, 239, 0.4)',
    decor: 'balloons',
    isDark: true,
  },
  {
    key: 'rose',
    name: 'Rose Romance',
    bg: '#2B1118',
    gradient: 'linear-gradient(135deg, #2B1118 0%, #4C0519 100%)',
    textColor: '#FFE4E6',
    accentColor: '#F43F5E',
    borderColor: 'rgba(244, 63, 94, 0.4)',
    decor: 'hearts',
    isDark: true,
  },
  {
    key: 'ocean',
    name: 'Ocean Azure',
    bg: '#082F49',
    gradient: 'linear-gradient(135deg, #082F49 0%, #0C4A6E 100%)',
    textColor: '#F0FDF4',
    accentColor: '#06B6D4',
    borderColor: 'rgba(6, 182, 212, 0.4)',
    decor: 'stars',
    isDark: true,
  },
  {
    key: 'emerald',
    name: 'Emerald Glow',
    bg: '#064E3B',
    gradient: 'linear-gradient(135deg, #064E3B 0%, #022C22 100%)',
    textColor: '#ECFDF5',
    accentColor: '#10B981',
    borderColor: 'rgba(16, 185, 129, 0.4)',
    decor: 'sparkles',
    isDark: true,
  },
  {
    key: 'dark',
    name: 'Classic Dark',
    bg: '#1A1A2E',
    gradient: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
    textColor: '#FFFFFF',
    accentColor: '#A855F7',
    borderColor: 'rgba(255, 255, 255, 0.2)',
    decor: 'sparkles',
    isDark: true,
  },
  {
    key: 'light',
    name: 'Light Elegance',
    bg: '#F8FAFC',
    gradient: 'linear-gradient(135deg, #FFFFFF 0%, #E2E8F0 100%)',
    textColor: '#0F172A',
    accentColor: '#6366F1',
    borderColor: 'rgba(15, 23, 42, 0.15)',
    decor: 'stars',
    isDark: false,
  },
  {
    key: 'gradient',
    name: 'Dynamic Gradient',
    bg: '#1E1B4B',
    gradient: 'linear-gradient(135deg, #1E1B4B 0%, #4C1D95 100%)',
    textColor: '#FFFFFF',
    accentColor: '#EC4899',
    borderColor: 'rgba(236, 72, 153, 0.35)',
    decor: 'sparkles',
    isDark: true,
  },
  {
    key: 'glass',
    name: 'Frosted Glass',
    bg: '#111827',
    gradient: 'linear-gradient(135deg, #111827 0%, #1F2937 100%)',
    textColor: '#F3F4F6',
    accentColor: '#38BDF8',
    borderColor: 'rgba(56, 189, 248, 0.3)',
    decor: 'stars',
    isDark: true,
  },
];

export const CARD_THEME_KEYS = CARD_THEMES.map(t => t.key);

export const DEFAULT_THEME_KEY = 'midnight';

export function getCardTheme(themeKey) {
  if (!themeKey) return CARD_THEMES[0];
  const normalized = String(themeKey).trim().toLowerCase();
  return CARD_THEMES.find(t => t.key === normalized) || CARD_THEMES[0];
}

export function isValidCardTheme(themeKey) {
  if (!themeKey) return false;
  const normalized = String(themeKey).trim().toLowerCase();
  return CARD_THEMES.some(t => t.key === normalized);
}
