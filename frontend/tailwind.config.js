/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
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
        purple: '#8B5CF6',
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
      },
    },
  },
  plugins: [],
}
