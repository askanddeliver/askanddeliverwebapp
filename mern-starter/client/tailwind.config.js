/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Existing admin primary (blue) — kept for admin dashboard
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        // Brand colors for public-facing site (driven by CSS variables for dynamic theming)
        brand: {
          sage: 'var(--brand-sage, #5B7765)',
          'sage-light': 'var(--brand-sage-light, #7A9A87)',
          'sage-dark': 'var(--brand-sage-dark, #3D5446)',
          charcoal: 'var(--brand-charcoal, #2A2A2A)',
          cream: 'var(--brand-cream, #F7F5F2)',
          'cream-dark': 'var(--brand-cream-dark, #EDE9E3)',
        },
        neutral: {
          50: '#FAFAFA',
          100: '#F5F5F5',
          200: '#E8E8E8',
          300: '#D1D1D1',
          400: '#A3A3A3',
          500: '#737373',
          600: '#525252',
          700: '#4A4A4A',
          800: '#333333',
          900: '#1A1A1A',
        },
        accent: {
          warm: 'var(--accent-warm, #E8A87C)',
          'warm-light': 'var(--accent-warm-light, #F2C9A8)',
          cool: 'var(--accent-cool, #6B9BAE)',
          'cool-light': 'var(--accent-cool-light, #9DC0CE)',
        },
      },
      fontFamily: {
        sans: ['bitter', 'Georgia', 'Times New Roman', 'serif'],
        display: ['bitter', 'Georgia', 'Times New Roman', 'serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      letterSpacing: {
        'tight-brand': '-0.02em',
        'tight-body': '-0.01em',
      },
      fontSize: {
        'display-xl': ['clamp(3.5rem, 8vw, 6rem)', { lineHeight: '0.95', letterSpacing: '-0.015em' }],
        'display-lg': ['clamp(2.5rem, 5vw, 4.5rem)', { lineHeight: '1.05', letterSpacing: '-0.015em' }],
        'display-md': ['clamp(2rem, 4vw, 3rem)', { lineHeight: '1.15', letterSpacing: '-0.01em' }],
        'display-sm': ['clamp(1.5rem, 3vw, 2rem)', { lineHeight: '1.25', letterSpacing: '-0.005em' }],
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '30': '7.5rem',
        '36': '9rem',
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0.0, 0.2, 1)',
        'in-out-custom': 'cubic-bezier(0.645, 0.045, 0.355, 1)',
        'spring': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },
      animation: {
        'fade-up': 'fadeUp 0.6s ease-out forwards',
        'fade-in': 'fadeIn 0.4s ease-out forwards',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
