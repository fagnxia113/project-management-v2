import type { Config } from 'tailwindcss'

export default {
  content: [
    "./src/frontend/**/*.{js,ts,jsx,tsx}",
    "./index.html",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2563eb',
      }
    },
  },
  plugins: [],
} satisfies Config
