/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        /* ── Primary (Emerald) ─────────────────────── */
        primary: {
          50:  '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10B981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
          950: '#022c22',
        },
        /* ── Neutral (refined gray scale) ──────────── */
        gray: {
          50:  '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
          950: '#0a0f1a',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'SF Pro Text', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'page-title': ['1.75rem', { lineHeight: '1.25', fontWeight: '700', letterSpacing: '-0.025em' }],
        'section-title': ['1.25rem', { lineHeight: '1.35', fontWeight: '600', letterSpacing: '-0.01em' }],
        'body': ['0.9375rem', { lineHeight: '1.55' }],
        'body-sm': ['0.8125rem', { lineHeight: '1.5' }],
        'caption': ['0.75rem', { lineHeight: '1.4' }],
      },
      spacing: {
        '4.5': '1.125rem',  /* 18px */
        '13':  '3.25rem',   /* 52px */
        '15':  '3.75rem',   /* 60px */
        '18':  '4.5rem',    /* 72px */
      },
      borderRadius: {
        'sm': '8px',
        'DEFAULT': '10px',
        'md': '12px',
        'lg': '16px',
        'xl': '20px',
        '2xl': '24px',
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0, 0, 0, 0.04), 0 6px 24px -6px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 4px 6px -1px rgba(0, 0, 0, 0.06), 0 12px 40px -8px rgba(0, 0, 0, 0.08)',
        'primary': '0 4px 16px -4px rgba(16, 185, 129, 0.4)',
        'primary-lg': '0 6px 20px -4px rgba(16, 185, 129, 0.55)',
        'modal': '0 24px 64px -16px rgba(0, 0, 0, 0.18)',
        'ai': '0 16px 36px -16px rgba(28, 28, 30, 0.2)',
        'ai-soft': '0 10px 28px -14px rgba(44, 44, 46, 0.16)',
        'nav': '0 1px 2px rgba(0, 0, 0, 0.04)',
        'shell': '0 20px 50px -28px rgba(15, 23, 42, 0.28)',
      },
      transitionDuration: {
        '150': '150ms',
        '200': '200ms',
        '250': '250ms',
      },
      animation: {
        'shimmer': 'shimmer 1.8s ease-in-out infinite',
        'fade-in': 'fadeIn 0.3s ease both',
      },
    },
  },
  plugins: [],
}
