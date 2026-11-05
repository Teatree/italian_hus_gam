import { useCallback, useLayoutEffect, useState } from 'react';
import { prefersReducedMotion } from '../lib/motion';
import type { CountryCode } from './country';

// ─────────────────────────────────────────────────────────────────────────────
//  THEME PLUMBING
//  Three independent attributes on <html> select the design tokens (src/styles/tokens.css):
//    data-theme   = dark | light     (dark for everyone unless the player chose light)
//    data-country = it | es | …      (the house's country: accent, shutters, flag)
//    data-season  = halloween        (only while a season is active)
//  Components never branch on these for colours; they just use the CSS variables.
// ─────────────────────────────────────────────────────────────────────────────

export type ThemeMode = 'dark' | 'light';

// The only new localStorage key the redesign adds. index.html reads it too, in an inline script
// that runs before the stylesheet, so there is never a flash of the wrong theme.
const THEME_KEY = 'gmc-theme';

function readSavedTheme(): ThemeMode {
  try {
    return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark'; // storage can throw (private mode, blocked cookies): dark is the default
  }
}

// Keep the mobile browser chrome in step with whatever the tokens resolve to right now.
function syncThemeColor(): void {
  const color = getComputedStyle(document.documentElement).getPropertyValue('--theme-color').trim();
  if (color) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color);
}

// Applies the three attributes and hands back the player's mode with a toggle.
// A season is dark-only: while one is active the page is forced dark and the toggle is hidden,
// but the saved preference is left alone and applies again once the season ends.
export function useTheme(country: CountryCode, season: string | null) {
  const [mode, setMode] = useState<ThemeMode>(readSavedTheme);

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = season ? 'dark' : mode;
    root.dataset.country = country;
    if (season) root.dataset.season = season;
    else delete root.dataset.season;
    syncThemeColor();
  }, [mode, country, season]);

  const toggle = useCallback(() => {
    const root = document.documentElement;
    // The whole page cross-fades together: .theming puts a 280ms colour transition on every
    // element for the duration of the switch.
    if (!prefersReducedMotion()) {
      root.classList.add('theming');
      window.setTimeout(() => root.classList.remove('theming'), 420);
    }
    const next: ThemeMode = mode === 'light' ? 'dark' : 'light';
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // not saved — the choice still holds for this visit
    }
    setMode(next);
  }, [mode]);

  return { mode, toggle };
}
