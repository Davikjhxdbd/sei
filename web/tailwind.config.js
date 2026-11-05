/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#0E1A2B',
          soft: '#17263A',
          line: '#233448',
        },
        canvas: '#F6F4EF',
        surface: '#FFFFFF',
        line: '#E4DFD5',
        muted: '#6C7688',
        brass: {
          DEFAULT: '#B08543',
          soft: '#D9C39B',
        },
        studio: {
          DEFAULT: '#3B4FA0',
          soft: '#E7E9F7',
        },
        production: '#12796B',
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
        card: '0 1px 2px rgba(14, 26, 43, 0.04), 0 8px 24px -16px rgba(14, 26, 43, 0.24)',
        lift: '0 18px 40px -24px rgba(14, 26, 43, 0.45)',
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
