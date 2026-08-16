import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class', '[data-admin-theme="dark"]'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        mint: {
          50: '#e6fdf5',
          100: '#c1f9e5',
          200: '#8cf3cf',
          300: '#4de4b2',
          400: '#10b981', // Brand Primary Mint
          500: '#059669',
          600: '#047857',
          700: '#065f46',
          800: '#064e3b',
          900: '#022c22',
        },
        dark: {
          bg: '#060a12',
          surface: '#060d19',
          elevated: '#081424',
          footer: '#040914',
          card: 'rgba(6, 13, 25, 0.9)',
          border: 'rgba(16, 185, 129, 0.25)',
        },
      },
      borderRadius: {
        'card': '22px',
        'footer-card': '28px',
        'cta-card': '32px',
        'cta-btn': '16px',
        'pill': '9999px',
      },
      boxShadow: {
        'mint-glow': '0 0 20px rgba(16, 185, 129, 0.2)',
        'mint-glow-hover': '0 12px 35px rgba(16, 185, 129, 0.25)',
        'badge-glow': '0 0 18px rgba(16, 185, 129, 0.18)',
        'glass-card': '0 10px 30px rgba(0, 0, 0, 0.5)',
        'footer-glow': '0 0 45px rgba(16, 185, 129, 0.12)',
        'icon-glow': '0 0 25px rgba(16, 185, 129, 0.35)',
        'cta-card-glow': '0 0 50px rgba(16, 185, 129, 0.15)',
        'btn-mint-glow': '0 0 25px rgba(16, 185, 129, 0.4)',
      },
      maxWidth: {
        'heading': '900px',
        'subtitle': '700px',
        'cta-container': '1240px',
        'cta-desc': '700px',
      },
      transitionDuration: {
        'card': '300ms',
        'cta': '200ms',
      },
      backdropBlur: {
        'glass': '16px',
      },
    },
  },
  plugins: [],
};

export default config;

