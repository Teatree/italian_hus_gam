import type { Guess } from '../types';
import { formatEuro } from './format';

const WRONG = '🟥';
const WIN = '🟩';
const UNUSED = '⬜';
const IRISH_FLAG = '🇮🇪';

// Build the emoji grid: one cell per try, separated by spaces. Wrong guesses are red, the
// winning guess is green, and any unused tries are white. A loss is all red (no green).
export function buildEmojiGrid(guesses: Guess[], maxTries: number): string {
  const cells: string[] = [];
  for (let i = 0; i < maxTries; i++) {
    const g = guesses[i];
    if (!g) cells.push(UNUSED);
    else if (g.direction === 'correct') cells.push(WIN);
    else cells.push(WRONG);
  }
  return cells.join(' ');
}

// The full text copied to the clipboard: title (with flag), a flag + spaced emoji grid,
// the closest guess's distance from the real price, and a link back to the game.
export function buildShareText(
  title: string,
  guesses: Guess[],
  maxTries: number,
  url: string,
  closestPercentOff: number,
  closestEuroOff: number,
): string {
  const distance =
    closestEuroOff === 0
      ? '🎯 RIGHT ON THE MONEY! (0% off)'
      : `🎯 ${closestPercentOff}% off (${formatEuro(closestEuroOff)})`;
  return `${title} ${IRISH_FLAG}\n${IRISH_FLAG} ${buildEmojiGrid(guesses, maxTries)}\n${distance}\n${url}`;
}

// Copy text to the clipboard, with a fallback for browsers without the async API.
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to legacy path
  }
  try {
    const el = document.createElement('textarea');
    el.value = text;
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}
