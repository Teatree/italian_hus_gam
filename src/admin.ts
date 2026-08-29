// ─────────────────────────────────────────────────────────────────────────────
//  ADMIN CONTROL
// ─────────────────────────────────────────────────────────────────────────────
//  DAILY ROTATION
//  The puzzle changes automatically every day at RESET_HOUR (wall-clock) in
//  RESET_TIME_ZONE. The property shown is the one whose folder/slug name matches the
//  current puzzle date in DD_MM_YY format (e.g. on 8 June 2026 it shows "08_06_26").
//  So to schedule a house for a given day, just create a folder named with that date.
//  If no property matches the current day, a "check back soon" screen shows.
//
//  ADDING A PROPERTY (no code changes needed):
//    1. Create src/properties/<YYYY_MM>/<DD_MM_YY>/  (the month folder is just for tidiness;
//       only the property's own folder name is the slug)
//    2. Drop in config.json (coordinates, mapZoom, soldPrice, propertyUrl, facts[])
//    3. Drop in the images (photo-1.png … photo-6.png — ordered by filename)
//  The folder is auto-discovered at build time; nothing else to register.
// ─────────────────────────────────────────────────────────────────────────────

export const APP_TITLE = 'Guess The House';

// ── Per-date theming defaults ───────────────────────────────────────────────────────────────
// A property's config.json may override these (titleIcon / titleIconUrl / shareFlag) to covertly
// swap in a house from another country. When a config omits a field, these defaults apply.
//  • DEFAULT_TITLE_ICON — filename (in public/) of the icon next to the title.
//  • DEFAULT_TITLE_ICON_URL — where that icon links to.
//  • DEFAULT_SHARE_FLAG — the flag emoji used in the share text.
export const DEFAULT_TITLE_ICON = 'italy_icon.png';
export const DEFAULT_TITLE_ICON_URL = 'https://youtu.be/IGBEp1zTbUw';
export const DEFAULT_SHARE_FLAG = '🇮🇪';

// How many tries the player gets (matches the number of images & facts per property).
export const MAX_TRIES = 6;

// A guess within this fraction of the real price counts as correct (0.10 = ±10%).
export const TOLERANCE = 0.1;

// Single vs double arrow: a guess that misses by more than this fraction of the price is
// "way off" and gets a double arrow.
export const FAR_THRESHOLD = 0.3;

// Daily reset: the puzzle switches at this wall-clock hour in this time zone.
// 'Europe/Kyiv' is Eastern European (EET/EEST) and is daylight-saving aware, so the
// reset stays at 10:00 on the local clock all year.
export const RESET_HOUR = 10;
export const RESET_TIME_ZONE = 'Europe/Kyiv';

// Testing only: force a specific property regardless of the date (set to its slug, e.g.
// '08_06_26' or 'villa-chianti'). Leave null for normal date-based scheduling.
const MANUAL_OVERRIDE_SLUG: string | null = null;

// scripts/preview-shot.mjs boots a throw-away dev server with VITE_OVERRIDE_SLUG set so it can
// screenshot a scheduled house before its date. That variable only ever exists in that script's
// own process, so it can't leak a future puzzle into a real build. Editing MANUAL_OVERRIDE_SLUG
// above still wins.
export const OVERRIDE_SLUG: string | null =
  MANUAL_OVERRIDE_SLUG ?? ((import.meta.env.VITE_OVERRIDE_SLUG as string | undefined) || null);