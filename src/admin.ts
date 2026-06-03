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
//    1. Create src/properties/<DD_MM_YY>/
//    2. Drop in config.json (coordinates, mapZoom, soldPrice, propertyUrl, facts[])
//    3. Drop in the images (photo-1.png … photo-6.png — ordered by filename)
//  The folder is auto-discovered at build time; nothing else to register.
// ─────────────────────────────────────────────────────────────────────────────

export const APP_TITLE = 'Guess The House';

// How many tries the player gets (matches the number of images & facts per property).
export const MAX_TRIES = 6;

// A guess within this fraction of the real price counts as correct (0.10 = ±10%).
export const TOLERANCE = 0.1;

// Daily reset: the puzzle switches at this wall-clock hour in this time zone.
// 'Europe/Kyiv' is Eastern European (EET/EEST) and is daylight-saving aware, so the
// reset stays at 10:00 on the local clock all year.
export const RESET_HOUR = 10;
export const RESET_TIME_ZONE = 'Europe/Kyiv';

// Testing only: force a specific property regardless of the date (set to its slug, e.g.
// '08_06_26' or 'villa-chianti'). Leave null for normal date-based scheduling.
export const OVERRIDE_SLUG: string | null = null;
