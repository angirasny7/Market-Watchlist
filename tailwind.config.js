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
        background: '#0B0E14',
        surface: {
          DEFAULT: '#111622',
          subtle: '#0E121C',
          hover: '#171E2E',
          active: '#1E273B',
        },
        border: {
          DEFAULT: '#1E2638',
          subtle: '#161B26',
          strong: '#2A354C',
        },
        fintech: {
          green: {
            DEFAULT: '#10B981',
            glow: 'rgba(16, 185, 129, 0.15)',
            text: '#34D399',
            border: '#059669',
          },
          red: {
            DEFAULT: '#F43F5E',
            glow: 'rgba(244, 63, 94, 0.15)',
            text: '#FB7185',
            border: '#E11D48',
          },
          amber: {
            DEFAULT: '#F59E0B',
            glow: 'rgba(245, 158, 11, 0.15)',
            text: '#FBBF24',
          },
          indigo: {
            DEFAULT: '#6366F1',
            glow: 'rgba(99, 102, 241, 0.15)',
            text: '#818CF8',
          },
          cyan: {
            DEFAULT: '#06B6D4',
            glow: 'rgba(6, 182, 212, 0.15)',
            text: '#22D3EE',
          },
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
        mono: [
          '"JetBrains Mono"',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace',
        ],
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.6', transform: 'scale(1.05)' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-in-right': 'slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in': 'fadeIn 0.2s ease-out',
      },
    },
  },
  plugins: [],
}
