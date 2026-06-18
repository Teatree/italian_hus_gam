// The data authored by hand in each property's config.json.
export interface PropertyData {
  // Where the map is centered, as [lat, lng] — paste straight from Google Maps.
  // No marker is drawn so the area stays a hint.
  coordinates: [number, number];
  // Reasonable zoom so the player can tell roughly where they are (defaults to 12).
  mapZoom?: number;
  // Facts shown to the player, in reveal order (one more revealed per wrong guess).
  facts: string[];
  // The correct answer (EUR). Never shown as a fact — only revealed at the end.
  soldPrice: number;
  // Listing URL shown as a "link to property" link on the win/lose screen.
  propertyUrl: string;
  // Maps each local photo slot to the idealista "foto" number to pull it from, e.g.
  // { "1": 12, "2": 7 } → photo-1 from .../foto/12/, photo-2 from .../foto/7/. Used only by
  // scripts/fetch-photos.mjs (the run-fetch.bat) at authoring time; ignored by the app.
  prop_pictures?: Record<string, number>;
  // ── Per-date theming (for covertly swapping in a non-Italian property) ──────────────────
  // Filename (in public/) of the icon shown next to the title, e.g. 'finland_icon.png'.
  // Defaults to DEFAULT_TITLE_ICON ('italy_icon.png') when omitted.
  titleIcon?: string;
  // Link the title icon points to. Defaults to DEFAULT_TITLE_ICON_URL when omitted.
  titleIconUrl?: string;
  // The flag emoji used in the share text (single unicode emoji, e.g. '🇫🇮').
  // Defaults to DEFAULT_SHARE_FLAG ('🇮🇪') when omitted.
  shareFlag?: string;
}

// A fully resolved property: the config.json data plus the slug (folder name) and the
// resolved image URLs collected from the folder.
export interface PropertyConfig extends PropertyData {
  slug: string;
  images: string[];
}

// Arrow shown next to a guess. The arrow points toward where the real price is:
//  up   = price is higher than your guess (you guessed too low)
//  down = price is lower than your guess (you guessed too high)
//  *-far = the guess misses by more than the far margin (min of FAR_THRESHOLD × price and
//          FAR_THRESHOLD_CAP euros) — shown as a double arrow
export type GuessDirection = 'up' | 'down' | 'up-far' | 'down-far' | 'correct';

export interface Guess {
  value: number;
  direction: GuessDirection;
}

export type GameStatus = 'playing' | 'won' | 'lost';

export interface SavedGame {
  slug: string;
  guesses: Guess[];
  status: GameStatus;
}
