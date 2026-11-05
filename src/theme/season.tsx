import { createContext, useContext, useLayoutEffect, type ComponentType } from 'react';
import { HALLOWEEN_FIRST_DAY, HALLOWEEN_LAST_DAY } from '../admin';
import { dateKeyOrder } from '../game/schedule';
import { CANDLE_FLICKER, HalloweenDecor, HalloweenPhotoDecor, PUMPKIN_PIN } from './halloween';

// ─────────────────────────────────────────────────────────────────────────────
//  SEASONS
//  A season is a token override ([data-season="<key>"] in src/styles/tokens.css) plus the
//  optional extras listed below. Each one is data, so a future season (Christmas, summer…)
//  is a new entry here and a new token block — no changes in the components.
//
//  While a season is active the page is dark-only and the theme toggle is hidden.
// ─────────────────────────────────────────────────────────────────────────────

export interface Season {
  // The value of <html data-season="…">; must match a token block in tokens.css.
  key: string;
  // Houses dated firstDay..lastDay (DD_MM_YY, inclusive) wear the season.
  firstDay: string;
  lastDay: string;
  // A stylesheet to pull in only while the season is active (its title font).
  fontHref?: string;
  // Replaces the magnifying glass in the clue pill, the Clues bar and the clue tiles.
  clueGlyph?: string;
  // Replace the paper confetti on a win / the thumbs-down rain on a loss.
  confettiGlyphs?: string[];
  rainGlyphs?: string[];
  // Played over each newly revealed photo during play (Web Animations keyframes).
  photoFlicker?: { frames: Keyframe[]; duration: number };
  // Replaces the accent-coloured map pin.
  pin?: { html: string; size: [number, number]; anchor: [number, number] };
  // Decorative layers: behind the whole page / inside the photo frame.
  Decor?: ComponentType;
  PhotoDecor?: ComponentType;
}

export const SEASONS: Season[] = [
  {
    key: 'halloween',
    firstDay: HALLOWEEN_FIRST_DAY,
    lastDay: HALLOWEEN_LAST_DAY,
    fontHref: 'https://fonts.googleapis.com/css2?family=Creepster&display=swap',
    clueGlyph: '🕯️',
    confettiGlyphs: ['🍬', '🍭', '🎃'],
    rainGlyphs: ['👻', '🦇', '💀'],
    photoFlicker: CANDLE_FLICKER,
    pin: PUMPKIN_PIN,
    Decor: HalloweenDecor,
    PhotoDecor: HalloweenPhotoDecor,
  },
];

// The season `slug`'s house wears, if any. Two conditions, both required:
//  • the house's own date is inside the season's window, and
//  • the live puzzle day (`todayKey`) hasn't passed the season's last day yet.
// The second is the hard stop: from the reset after the last day the season is gone everywhere,
// even on a past-day link to one of its houses or an OVERRIDE_SLUG preview.
export function activeSeason(slug: string, todayKey: string): Season | null {
  const day = dateKeyOrder(slug);
  const today = dateKeyOrder(todayKey);
  if (day === null || today === null) return null;
  for (const season of SEASONS) {
    const first = dateKeyOrder(season.firstDay);
    const last = dateKeyOrder(season.lastDay);
    if (first === null || last === null) continue;
    if (day >= first && day <= last && today <= last) return season;
  }
  return null;
}

const SeasonContext = createContext<Season | null>(null);
export const SeasonProvider = SeasonContext.Provider;
export const useSeason = () => useContext(SeasonContext);

// Pulls in the season's stylesheet (its font) — only while active, so ordinary days never
// download it. The <html data-season> attribute itself is set by useTheme().
export function useSeasonAssets(season: Season | null) {
  const href = season?.fontHref;
  useLayoutEffect(() => {
    if (!href) return;
    if (document.querySelector(`link[href="${href}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }, [href]);
}
