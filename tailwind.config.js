/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // dark navy theme matching the reference
        backdrop: '#0e1b2a',
        panel: '#13263b',
        panelAlt: '#0c1a29',
        accent: '#16a34a',
      },
    },
  },
  plugins: [],
};
