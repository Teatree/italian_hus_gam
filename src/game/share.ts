import type { Guess, Verdict } from '../types';
import { DEFAULT_SHARE_FLAG } from '../admin';

const WRONG = '🟥';
const WIN = '🟩';
const UNUSED = '⬜';

// The price-verdict line: pure opinion, never a euro amount. The verdict itself is wrapped
// in ||…|| (Discord/Telegram spoiler markup) so it doesn't act as a hint for whoever the
// message is shared with — they tap to reveal it after playing.
const VERDICT_LINES: Record<Verdict, string> = {
  steal: '🧾 My verdict: ||STEAL 🤑||',
  fair: '🧾 My verdict: ||Fair price 🤝||',
  ripoff: '🧾 My verdict: ||RIP-OFF 🚨||',
};

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
// result line, and a link back to the game. The `flag` emoji (both occurrences) is per-date so
// a swapped-in non-Italian house shares its own country's flag. On a win we share the closest
// guess's percentage off — but never the euro amount, so it doesn't give away the actual price.
// On a loss we skip the percentage entirely and just own it.
export function buildShareText(
  title: string,
  guesses: Guess[],
  maxTries: number,
  url: string,
  closestPercentOff: number,
  flag: string = DEFAULT_SHARE_FLAG,
  verdict?: Verdict | null,
): string {
  const won = guesses.some((g) => g.direction === 'correct');
  let result: string;
  if (!won) {
    result = 'Look how much I suck!';
  } else if (closestPercentOff === 0) {
    result = '🎯 RIGHT ON THE MONEY! (0% off)';
  } else {
    result = `🎯 I was ${closestPercentOff}% off`;
  }
  const verdictLine = verdict ? `\n${VERDICT_LINES[verdict]}` : '';
  return `${title} ${flag}\n${flag} ${buildEmojiGrid(guesses, maxTries)}\n${result}${verdictLine}\n${url}`;
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
