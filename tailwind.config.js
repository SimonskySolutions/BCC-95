/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        slate: {
          25: '#f8fafc',
        },
      },
      boxShadow: {
        card: '0 10px 30px -24px rgba(15, 23, 42, 0.55)',
      },
    },
  },
  plugins: [],
}

