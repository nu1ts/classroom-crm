/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,js}",
    "./reference/**/*.{html,js}",
    "./*.{html,js}"
  ],
  theme: {
    extend: {
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '0.875rem' }],
        '3xs': ['0.625rem', { lineHeight: '0.75rem' }],
      },
      colors: {
        brand: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          300: '#7cc5fb',
          400: '#36a6f6',
          500: '#0070c0',
          600: '#005bb0',
          700: '#00488f',
          800: '#033d75',
          900: '#073362',
          950: '#052142',
          sidebar: '#0b1d33',
          sidebarHover: '#132b49',
          sidebarActive: '#0070c0',
          accent: '#f59e0b'
        }
      }
    },
  },
  plugins: [],
}
