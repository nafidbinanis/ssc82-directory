/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        parchment: {
          50: '#FBF8F2',
          100: '#F5EFE2',
          200: '#EAE0C9',
        },
        forest: {
          50: '#EEF3EE',
          100: '#D3E0D5',
          200: '#A6C1AB',
          400: '#4C7C58',
          500: '#2F5D3A',
          600: '#234730',
          700: '#1B3826',
          800: '#152C1D',
          900: '#0F2016',
        },
        brick: {
          50: '#FBEAE6',
          400: '#C4573F',
          500: '#A8402C',
          600: '#8A3323',
        },
        ink: {
          400: '#6B6459',
          500: '#4A443B',
          700: '#2E2A24',
          900: '#1C1914',
        },
      },
      fontFamily: {
        display: ['"Source Serif 4"', 'Georgia', 'serif'],
        body: ['"Public Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      backgroundImage: {
        'ledger-lines': 'repeating-linear-gradient(transparent, transparent 39px, rgba(76,124,88,0.08) 40px)',
      },
    },
  },
  plugins: [],
}
