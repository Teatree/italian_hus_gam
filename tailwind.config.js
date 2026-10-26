/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // Palette lives in CSS variables (src/index.css) so a seasonal theme can swap it in one
      // place: dark navy by default, purple/orange under <html data-theme="halloween">.
      colors: {
        backdrop: 'rgb(var(--c-backdrop) / <alpha-value>)',
        panel: 'rgb(var(--c-panel) / <alpha-value>)',
        panelAlt: 'rgb(var(--c-panel-alt) / <alpha-value>)',
        accent: 'rgb(var(--c-accent) / <alpha-value>)',
        accentHover: 'rgb(var(--c-accent-hover) / <alpha-value>)',
      },
      fontFamily: {
        // Halloween title/result font, loaded on demand by src/theme/halloween.tsx.
        spooky: ['Creepster', 'cursive'],
      },
    },
  },
  plugins: [],
};
