import type { SavedGame } from '../types';

// Progress is keyed per house, so switching the active house starts a fresh game while
// a previously finished house keeps its saved result under its own key.
const PREFIX = 'gth:v1:';

function key(slug: string): string {
  return `${PREFIX}${slug}`;
}

export function loadGame(slug: string): SavedGame | null {
  try {
    const raw = localStorage.getItem(key(slug));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedGame;
    if (parsed && parsed.slug === slug && Array.isArray(parsed.guesses)) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveGame(game: SavedGame): void {
  try {
    localStorage.setItem(key(game.slug), JSON.stringify(game));
  } catch {
    // localStorage may be unavailable (private mode / disabled) — fail silently.
  }
}
