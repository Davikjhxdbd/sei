/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Tokens do Design System — valores em web/src/index.css (:root / .dark)
        ink: {
          DEFAULT: 'rgb(var(--mmv-ink) / <alpha-value>)',
          soft: 'rgb(var(--mmv-ink-soft) / <alpha-value>)',
          line: 'rgb(var(--mmv-ink-line) / <alpha-value>)',
        },
        canvas: 'rgb(var(--mmv-canvas) / <alpha-value>)',
        surface: 'rgb(var(--mmv-surface) / <alpha-value>)',
        line: 'rgb(var(--mmv-line) / <alpha-value>)',
        muted: 'rgb(var(--mmv-muted) / <alpha-value>)',
        // Superfícies sólidas escuras (cabeçalho, painéis e botões primários)
        strong: {
          DEFAULT: 'rgb(var(--mmv-strong) / <alpha-value>)',
          soft: 'rgb(var(--mmv-strong-soft) / <alpha-value>)',
        },
        brass: {
          DEFAULT: 'rgb(var(--mmv-brass) / <alpha-value>)',
          soft: 'rgb(var(--mmv-brass-soft) / <alpha-value>)',
          deep: 'rgb(var(--mmv-brass-deep) / <alpha-value>)',
        },
        studio: {
          DEFAULT: 'rgb(var(--mmv-studio) / <alpha-value>)',
          soft: 'rgb(var(--mmv-studio-soft) / <alpha-value>)',
        },
        production: 'rgb(var(--mmv-production) / <alpha-value>)',
        danger: {
          DEFAULT: '#DC2626',
          strong: '#B91C1C',
        },
        // Tonalidades de estado também seguem o tema
        red: {
          50: 'rgb(var(--mmv-red-50) / <alpha-value>)',
          200: 'rgb(var(--mmv-red-200) / <alpha-value>)',
          600: 'rgb(var(--mmv-red-600) / <alpha-value>)',
          700: 'rgb(var(--mmv-red-700) / <alpha-value>)',
          800: 'rgb(var(--mmv-red-800) / <alpha-value>)',
        },
        amber: {
          50: 'rgb(var(--mmv-amber-50) / <alpha-value>)',
          100: 'rgb(var(--mmv-amber-100) / <alpha-value>)',
          200: 'rgb(var(--mmv-amber-200) / <alpha-value>)',
          700: 'rgb(var(--mmv-amber-700) / <alpha-value>)',
          800: 'rgb(var(--mmv-amber-800) / <alpha-value>)',
          900: 'rgb(var(--mmv-amber-900) / <alpha-value>)',
        },
        emerald: {
          50: 'rgb(var(--mmv-emerald-50) / <alpha-value>)',
          200: 'rgb(var(--mmv-emerald-200) / <alpha-value>)',
          600: 'rgb(var(--mmv-emerald-600) / <alpha-value>)',
          700: 'rgb(var(--mmv-emerald-700) / <alpha-value>)',
          900: 'rgb(var(--mmv-emerald-900) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        display: ['Georgia', 'Cambria', 'Times New Roman', 'serif'],
      },
      boxShadow: {
        card: 'var(--mmv-shadow-card)',
        lift: 'var(--mmv-shadow-lift)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
      letterSpacing: {
        wider2: '0.14em',
      },
    },
  },
  plugins: [],
};
