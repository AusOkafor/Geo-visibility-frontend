/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0A0A0B',
        surface: '#111113',
        'surface-2': '#0D0D0F',
        teal: '#00D4FF',
        'teal-dim': 'rgba(0,212,255,0.08)',
      },
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        mono: ['"Space Mono"', 'monospace'],
      },
      borderColor: {
        subtle: 'rgba(255,255,255,0.05)',
      },
    },
  },
  plugins: [],
}

