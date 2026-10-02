import { dateKeyOrder } from './schedule';

// Share links pin the puzzle day in the URL (`?day=DD_MM_YY`), so a link shared on the 10th
// still opens the 10th's house when it's clicked on the 11th.
const DAY_PARAM = 'day';

// The page's own URL with nothing but the day param — what goes into the share text.
export function dayUrl(slug: string): string {
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set(DAY_PARAM, slug);
  return url.toString();
}

// The page's own URL with no day param: today's puzzle.
export function todayUrl(): string {
  const url = new URL(window.location.href);
  url.searchParams.delete(DAY_PARAM);
  return url.toString();
}

// Which past day the URL asks for, if it's one we may show. Only a real puzzle dated strictly
// before today counts: a future date would leak an upcoming house, and today's date (or an
// unknown/garbled one) just means "today's puzzle". Anything not honoured is stripped from the
// address bar so the page never shows a day param that disagrees with the house on screen.
export function resolvePastDay(todayKey: string, exists: (slug: string) => boolean): string | null {
  const url = new URL(window.location.href);
  const requested = url.searchParams.get(DAY_PARAM);
  if (requested === null) return null;

  const order = dateKeyOrder(requested);
  const today = dateKeyOrder(todayKey);
  if (order !== null && today !== null && order < today && exists(requested)) return requested;

  url.searchParams.delete(DAY_PARAM);
  window.history.replaceState(null, '', url.toString());
  return null;
}
