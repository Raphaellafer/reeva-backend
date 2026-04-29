/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: '#1a1a2e',
      },
      borderRadius: {
        card: '10px',
        btn: '7px',
      },
    },
  },
  plugins: [],
}

