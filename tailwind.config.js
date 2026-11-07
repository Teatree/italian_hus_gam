/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // Every value below points at a CSS variable from src/styles/tokens.css, so a utility
      // class follows the theme (dark/light), the house's country and the season for free.
      // Never reach for a Tailwind palette colour or a raw hex in a component.
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        raised: 'var(--raised)',
        line: 'var(--line)',
        text: 'var(--text)',
        muted: 'var(--muted)',
        dim: 'var(--dim)',
        accent: 'var(--accent)',
        'on-accent': 'var(--on-accent)',
        miss: 'var(--miss)',
        'miss-bg': 'var(--miss-bg)',
        ok: 'var(--ok)',
        'on-ok': 'var(--on-ok)',
        'lock-ring': 'var(--lock-ring)',
      },
      fontFamily: {
        display: 'var(--font-display)',
        ui: 'var(--font-ui)',
      },
      borderRadius: {
        photo: 'var(--radius-photo)',
        card: 'var(--radius-card)',
        tile: 'var(--radius-tile)',
        sheet: 'var(--radius-sheet)',
      },
      transitionTimingFunction: {
        out: 'var(--ease-out)',
        in: 'var(--ease-in)',
        'in-out': 'var(--ease-in-out)',
        spring: 'var(--ease-spring)',
        sheet: 'var(--ease-sheet)',
      },
      zIndex: {
        sticky: '1050',
        anchor: '1100',
        fx: '1150',
        scrim: '1200',
        sheet: '1210',
        zoom: '1220',
        toast: '1300',
      },
    },
  },
  plugins: [],
};
