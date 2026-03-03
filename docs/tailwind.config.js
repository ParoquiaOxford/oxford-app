/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './signin.html', './dashboard.html', './src/**/*.{js,ts,jsx,tsx,html}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fffbeb',
          100: '#fef3c7',
          700: '#b45309',
          800: '#92400e',
        },
      },
    },
  },
  plugins: [],
}

