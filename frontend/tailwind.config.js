import colors from 'tailwindcss/colors';
import plugin from 'tailwindcss/plugin';

/**
 * Auto-Wish design tokens.
 *
 * All surface / border / text colours are backed by CSS variables (see src/index.css)
 * that are swapped by the `.dark` class on <html>. Because every token is declared as
 * `rgb(var(--token) / <alpha-value>)`, Tailwind opacity modifiers (`bg-surface/60`,
 * `border-line/40`) keep working in both themes.
 */
const rgbVar = (name) => `rgb(var(--${name}) / <alpha-value>)`;

const hexToChannels = (hex) => {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).join(' ');
};

// Accent hues whose light shades (300/400/500) are unreadable on light surfaces.
// In light mode we shift them to darker stops so semantic colours stay legible (WCAG).
const HUES = [
  'red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal',
  'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose',
];
const BRIGHT_HUES = ['yellow', 'amber', 'lime', 'green', 'emerald', 'teal', 'cyan', 'sky', 'orange'];

const hueExtend = {};
const hueBaseCss = { ':root': {}, '.dark': {} };
HUES.forEach((hue) => {
  const scale = colors[hue];
  hueExtend[hue] = {
    300: rgbVar(`${hue}-300`),
    400: rgbVar(`${hue}-400`),
    500: rgbVar(`${hue}-500`),
  };
  // Light theme: darker equivalents
  hueBaseCss[':root'][`--${hue}-300`] = hexToChannels(scale[700]);
  hueBaseCss[':root'][`--${hue}-400`] = hexToChannels(scale[600]);
  hueBaseCss[':root'][`--${hue}-500`] = hexToChannels(BRIGHT_HUES.includes(hue) ? scale[600] : scale[500]);
  // Dark theme: Tailwind defaults
  hueBaseCss['.dark'][`--${hue}-300`] = hexToChannels(scale[300]);
  hueBaseCss['.dark'][`--${hue}-400`] = hexToChannels(scale[400]);
  hueBaseCss['.dark'][`--${hue}-500`] = hexToChannels(scale[500]);
});

const slateSteps = [50, 100, 200, 300, 350, 400, 500, 600, 700, 800, 850, 900, 950];
const slateExtend = Object.fromEntries(slateSteps.map((s) => [s, rgbVar(`slate-${s}`)]));

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Noto Sans', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        // Semantic surface tokens (theme aware)
        app: rgbVar('app'),
        surface: rgbVar('surface'),
        inset: rgbVar('inset'),
        raised: rgbVar('raised'),
        'raised-hover': rgbVar('raised-hover'),
        line: rgbVar('line'),
        'line-soft': rgbVar('line-soft'),
        'line-strong': rgbVar('line-strong'),
        fg: rgbVar('fg'),
        ring: rgbVar('ring'),

        // Existing brand colours (preserved)
        dark: {
          '900': '#0F172A',
          '800': '#1E293B',
          '700': '#334155',
          '600': '#475569',
          '500': '#64748B',
          '400': '#94A3B8',
        },
        primary: '#3B82F6',
        accent: '#6366F1',
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',

        slate: slateExtend,
        ...hueExtend,
        purple: { ...hueExtend.purple, DEFAULT: '#8B5CF6' },
      },
      borderRadius: {
        surface: 'var(--radius-surface)',
        control: 'var(--radius-control)',
      },
      boxShadow: {
        glass: 'var(--glass-shadow)',
        'glass-lg': 'var(--glass-shadow-lg)',
        glow: 'var(--glow-accent)',
      },
      backdropBlur: {
        glass: 'var(--glass-blur)',
      },
      transitionTimingFunction: {
        premium: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [
    plugin(({ addBase }) => {
      addBase(hueBaseCss);
    }),
  ],
};
