const tomato = { 50: '#fcf5f0', 100: '#f3e5de', 200: '#eed0c3', 300: '#eab6a6', 400: '#e39a87', 500: '#b94e3e', 600: '#a94435', 700: '#983e32', 800: '#77392e', 900: '#50352d', 950: '#30201b' }
const moss = { 50: '#f4f6ef', 100: '#e8edde', 200: '#d6dfc9', 300: '#b9cba7', 400: '#a7bc91', 500: '#718b64', 600: '#647b5b', 700: '#4d6048', 800: '#3b4c39', 900: '#2d3c2c', 950: '#1d291e' }
const neutral = { 50: '#fbfaf5', 100: '#f1efe7', 200: '#e1e3d8', 300: '#c9cec0', 400: '#9aa491', 500: '#788271', 600: '#656d61', 700: '#465243', 800: '#333f34', 900: '#252e28', 950: '#1c2320' }
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        'inter': ['Inter', 'sans-serif'],
      },
      colors: {
        gray: neutral, slate: neutral, zinc: neutral,
        rose: tomato,
        green: moss, emerald: moss,
        primary: tomato,
        secondary: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 2s infinite',
      }
    },
  },
  plugins: [],
}
