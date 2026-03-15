/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        verdict: {
          primary: '#3b82f6',
          secondary: '#1e40af',
          accent: '#60a5fa',
        }
      }
    },
  },
  plugins: [],
}
