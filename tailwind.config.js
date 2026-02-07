/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        base: 'rgb(var(--color-bg-base) / <alpha-value>)',
        elevated: 'rgb(var(--color-bg-elevated) / <alpha-value>)',
        surface: {
          DEFAULT: 'rgb(var(--color-bg-surface) / <alpha-value>)',
          0: 'rgb(var(--color-surface-0) / <alpha-value>)',
          50: 'rgb(var(--color-surface-50) / <alpha-value>)',
          100: 'rgb(var(--color-surface-100) / <alpha-value>)',
          200: 'rgb(var(--color-surface-200) / <alpha-value>)',
          300: 'rgb(var(--color-surface-300) / <alpha-value>)',
          500: 'rgb(var(--color-surface-500) / <alpha-value>)',
          700: 'rgb(var(--color-surface-700) / <alpha-value>)',
          800: 'rgb(var(--color-surface-800) / <alpha-value>)',
        },
        card: 'rgb(var(--color-bg-card) / <alpha-value>)',
        input: 'rgb(var(--color-bg-input) / <alpha-value>)',
        overlay: 'rgb(var(--color-bg-overlay) / <alpha-value>)',
        foreground: 'rgb(var(--color-text-primary) / <alpha-value>)',
        secondary: 'rgb(var(--color-text-secondary) / <alpha-value>)',
        muted: {
          DEFAULT: 'rgb(var(--color-text-muted) / <alpha-value>)',
          300: 'rgb(var(--color-muted-300) / <alpha-value>)',
          400: 'rgb(var(--color-muted-400) / <alpha-value>)',
          500: 'rgb(var(--color-muted-500) / <alpha-value>)',
          600: 'rgb(var(--color-muted-600) / <alpha-value>)',
          700: 'rgb(var(--color-muted-700) / <alpha-value>)',
          900: 'rgb(var(--color-muted-900) / <alpha-value>)',
        },
        inverse: 'rgb(var(--color-text-inverse) / <alpha-value>)',
        border: {
          DEFAULT: 'rgb(var(--color-border) / <alpha-value>)',
          30: 'rgb(var(--color-border-num-30) / <alpha-value>)',
          50: 'rgb(var(--color-border-num-50) / <alpha-value>)',
          100: 'rgb(var(--color-border-num-100) / <alpha-value>)',
          200: 'rgb(var(--color-border-num-200) / <alpha-value>)',
          300: 'rgb(var(--color-border-num-300) / <alpha-value>)',
          500: 'rgb(var(--color-border-num-500) / <alpha-value>)',
          600: 'rgb(var(--color-border-num-600) / <alpha-value>)',
          700: 'rgb(var(--color-border-num-700) / <alpha-value>)',
        },
        'border-hover': 'rgb(var(--color-border-hover) / <alpha-value>)',
        'border-strong': 'rgb(var(--color-border-strong) / <alpha-value>)',
        primary: 'rgb(var(--color-primary) / <alpha-value>)',
        'primary-foreground': 'rgb(var(--color-on-primary) / <alpha-value>)',
        success: 'rgb(var(--color-success) / <alpha-value>)',
        warning: 'rgb(var(--color-warning) / <alpha-value>)',
        danger: 'rgb(var(--color-danger) / <alpha-value>)',
        info: 'rgb(var(--color-info) / <alpha-value>)',
        'accent-bg': 'rgb(var(--color-accent-bg) / <alpha-value>)',
        'accent-bg-hover': 'rgb(var(--color-accent-bg-hover) / <alpha-value>)',
        emerald: {
          50: '#f0f5ed',
          100: '#e8f0e0',
          200: '#d4e4c8',
          300: '#b8d4a0',
          400: '#9bc278',
          500: '#7fa05a',
          600: '#6b8e4a',
          700: '#4a6b2a',
          800: '#3d5a1f',
          900: '#2d5016',
          950: '#1a2e16',
        },
        slate: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        zinc: {
          50: '#fafafa',
          100: '#f4f4f5',
          200: '#e4e4e7',
          300: '#d4d4d8',
          400: '#a1a1aa',
          500: '#71717a',
          600: '#52525b',
          700: '#3f3f46',
          800: '#27272a',
          850: '#1f1f23',
          900: '#18181b',
          950: '#09090b',
        },
        dark: {
          50: '#27272a',
          100: '#1f1f23',
          200: '#18181b',
          300: '#121214',
          400: '#0c0c0e',
          500: '#09090b',
          600: '#050506',
          card: 'rgba(24, 24, 27, 0.8)',
          glass: 'rgba(15, 15, 17, 0.9)',
        },
        accent: {
          cyan: '#06b6d4',
          amber: '#f59e0b',
          rose: '#f43f5e',
          teal: '#14b8a6',
        },
      },
      screens: {
        'landscape': { 'raw': '(orientation: landscape)' },
        'portrait': { 'raw': '(orientation: portrait)' },
        'xs': '475px',
        '3xl': '1920px',  // For large TV screens (55" and above)
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'glow': '0 0 20px rgba(74, 107, 42, 0.2)',
        'glow-sm': '0 0 10px rgba(74, 107, 42, 0.12)',
        'glow-lg': '0 0 40px rgba(74, 107, 42, 0.3)',
        'glow-xl': '0 0 60px rgba(74, 107, 42, 0.35)',
        'dark': '0 4px 20px rgba(26, 46, 22, 0.4)',
        'dark-lg': '0 8px 40px rgba(26, 46, 22, 0.5)',
        'dark-xl': '0 12px 60px rgba(26, 46, 22, 0.6)',
        'inner-glow': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.05)',
        'card': '0 4px 24px -4px rgba(26, 46, 22, 0.25)',
        'card-hover': '0 8px 32px -4px rgba(26, 46, 22, 0.35)',
      },
      borderRadius: {
        'xs': '0.5rem',      // 8px
        'sm': '0.75rem',     // 12px
        'md': '1rem',        // 16px
        'lg': '1.25rem',     // 20px
        'xl': '1.5rem',      // 24px
        '2xl': '1.75rem',   // 28px
        '3xl': '2rem',      // 32px
        '4xl': '2.5rem',    // 40px
        '5xl': '3rem',      // 48px
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
        '6xl': ['3.75rem', { lineHeight: '1' }],
        '7xl': ['4.5rem', { lineHeight: '1' }],
        '8xl': ['6rem', { lineHeight: '1' }],
        '9xl': ['8rem', { lineHeight: '1' }],
      },
      spacing: {
        '0.5': '0.125rem',   // 2px
        '1': '0.25rem',      // 4px
        '1.5': '0.375rem',   // 6px
        '2': '0.5rem',       // 8px
        '2.5': '0.625rem',   // 10px
        '3': '0.75rem',      // 12px
        '3.5': '0.875rem',   // 14px
        '4': '1rem',         // 16px
        '5': '1.25rem',      // 20px
        '6': '1.5rem',       // 24px
        '7': '1.75rem',      // 28px
        '8': '2rem',         // 32px
        '9': '2.25rem',      // 36px
        '10': '2.5rem',      // 40px
        '11': '2.75rem',     // 44px
        '12': '3rem',        // 48px
        '14': '3.5rem',      // 56px
        '16': '4rem',        // 64px
        '18': '4.5rem',      // 72px
        '20': '5rem',        // 80px
        '22': '5.5rem',      // 88px
        '24': '6rem',        // 96px
        '28': '7rem',        // 112px
        '32': '8rem',        // 128px
        '36': '9rem',        // 144px
        '40': '10rem',       // 160px
        '44': '11rem',       // 176px
        '48': '12rem',       // 192px
        '52': '13rem',       // 208px
        '56': '14rem',       // 224px
        '60': '15rem',       // 240px
        '64': '16rem',       // 256px
        '72': '18rem',       // 288px
        '80': '20rem',       // 320px
        '88': '22rem',       // 352px
        '96': '24rem',       // 384px
        '128': '32rem',      // 512px
      },
      animation: {
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'slide-up': 'slide-up 0.3s ease-out',
        'slide-down': 'slide-down 0.3s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
        'fade-in': 'fade-in 0.4s ease-out',
        'fade-in-up': 'fade-in-up 0.4s ease-out',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
        'spin-slow': 'spin 3s linear infinite',
        'bounce-subtle': 'bounce-subtle 1s ease-in-out infinite',
        'gradient-shift': 'gradient-shift 8s ease infinite',
      },
      keyframes: {
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(74, 107, 42, 0.2)' },
          '50%': { boxShadow: '0 0 35px rgba(74, 107, 42, 0.35)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-down': {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'scale-in': {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        'bounce-subtle': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        'gradient-shift': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'gradient-shine': 'linear-gradient(110deg, transparent 25%, rgba(255,255,255,0.1) 50%, transparent 75%)',
      },
      transitionDuration: {
        '150': '150ms',
        '200': '200ms',
        '250': '250ms',
        '300': '300ms',
        '400': '400ms',
        '500': '500ms',
      },
      transitionTimingFunction: {
        'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'ease-out': 'cubic-bezier(0, 0, 0.2, 1)',
        'ease-in': 'cubic-bezier(0.4, 0, 1, 1)',
        'ease-in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
};
