/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        steam: {
          dark: '#171a21',
          light: '#1b2838',
          accent: '#66c0f4',
          text: '#c6d4df',
          green: '#a4d007'
        }
      },
      fontFamily: {
        sans: ['"Microsoft YaHei"', 'Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
