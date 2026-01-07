/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        lime: {
          400: '#B8FF00',
          500: '#AAFF00',
          600: '#9AEF00',
        },
        dark: {
          50: '#1a1a1a',
          100: '#151515',
          200: '#121212',
          300: '#0f0f0f',
          400: '#0a0a0a',
          500: '#050505',
          600: '#000000',
          card: 'rgba(30, 30, 30, 0.6)',
          glass: 'rgba(20, 20, 20, 0.8)',
        },
      },
      screens: {
        'landscape': { 'raw': '(orientation: landscape)' },
        'portrait': { 'raw': '(orientation: portrait)' },
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'glow': '0 0 20px rgba(170, 255, 0, 0.3)',
        'glow-sm': '0 0 10px rgba(170, 255, 0, 0.2)',
        'glow-lg': '0 0 30px rgba(170, 255, 0, 0.4)',
        'dark': '0 4px 20px rgba(0, 0, 0, 0.5)',
        'dark-lg': '0 8px 40px rgba(0, 0, 0, 0.6)',
      },
      animation: {
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(170, 255, 0, 0.3)' },
          '50%': { boxShadow: '0 0 30px rgba(170, 255, 0, 0.5)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
      },
    },
  },
  plugins: [],
};
