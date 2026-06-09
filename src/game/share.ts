import type { Guess } from '../types';

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

// The full text copied to the clipboard: title (with flag), a flag + spaced emoji grid, a
// result line, and a link back to the game. On a win we share the closest guess's percentage
// off — but never the euro amount, so it doesn't give away the actual price. On a loss we skip
// the percentage entirely and just own it.
export function buildShareText(
  title: string,
  guesses: Guess[],
  maxTries: number,
  url: string,
  closestPercentOff: number,
): string {
  const won = guesses.some((g) => g.direction === 'correct');
  let result: string;
  if (!won) {
    result = 'Look how much I suck!';
  } else if (closestPercentOff === 0) {
    result = '🎯 RIGHT ON THE MONEY! (0% off)';
  } else {
    result = `🎯 ${closestPercentOff}% off`;
  }
  return `${title} ${IRISH_FLAG}\n${IRISH_FLAG} ${buildEmojiGrid(guesses, maxTries)}\n${result}\n${url}`;
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
