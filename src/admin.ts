import type { PropertyConfig } from './types';
import { properties } from './properties';

// ─────────────────────────────────────────────────────────────────────────────
//  ADMIN CONTROL
//  Edit the values below to control the game. The only thing you usually change is
//  ACTIVE_SLUG — set it to the property folder you want players to see right now.
//  Each property's images / coordinates / facts / price live in
//  src/properties/<slug>.ts.
// ─────────────────────────────────────────────────────────────────────────────

export const APP_TITLE = 'Guess The House';

// How many tries the player gets (matches the number of images & facts per property).
export const MAX_TRIES = 6;

// A guess within this fraction of the real price counts as correct (0.10 = ±10%).
export const TOLERANCE = 0.1;

// ← Change this to switch the displayed house. Must match a slug in src/properties.
export const ACTIVE_SLUG = 'villa-chianti';

export const activeProperty: PropertyConfig = properties[ACTIVE_SLUG];

if (!activeProperty) {
  throw new Error(
    `admin.ts: ACTIVE_SLUG "${ACTIVE_SLUG}" is not a registered property. ` +
      `Available: ${Object.keys(properties).join(', ')}`,
  );
}
