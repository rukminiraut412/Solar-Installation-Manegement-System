/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: '#0B0D10',
        charcoal: '#1A1D23',
        surface: '#FFFFFF',
        'gray-soft': '#F7F8FA',
        'gray-border': '#DDE1E7',
        'solar-blue': '#1D6FE0',
        'solar-blue-dark': '#1859B8',
        success: '#1E8E3E',
        warning: '#B26A00',
        danger: '#C5221F',
        ai: '#5B4BC4',
        'ai-bg': '#F5F3FF',
        'ai-border': '#DDD6FE'
      }
    },
  },
  plugins: [],
}
