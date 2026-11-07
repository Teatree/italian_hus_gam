// The data authored by hand in each property's config.json.
export interface PropertyData {
  // Where the map is centered, as [lat, lng] — paste straight from Google Maps.
  // A pin is drawn at this exact spot.
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
  // Names the house's country as '<country>_icon.png', e.g. 'finland_icon.png'. It drives the
  // flag chip ("Talo Nº 12 · Suomi"), the accent colour, the shutters and the confetti — see
  // src/theme/country.ts. Defaults to DEFAULT_TITLE_ICON ('italy_icon.png') when omitted.
  titleIcon?: string;
  // The "bonus link" behind the flag chip and the footer. Defaults to DEFAULT_TITLE_ICON_URL
  // when omitted; set it to "" for a house with no bonus link.
  titleIconUrl?: string;
  // The flag emoji used in the share text (single unicode emoji, e.g. '🇫🇮').
  // Defaults to the flag of the house's country (from titleIcon) when omitted.
  shareFlag?: string;
  // Opt-in: after pressing Share, ask the player whether the sold price was a steal / fair /
  // rip-off before the text is copied. The vote joins the share text and analytics.
  priceVerdict?: boolean;
  // Optional place name shown on the verdict sheet under the price. When omitted it is read
  // from the first fact ("Located in Lerici" → "Lerici"), so no existing config needs it.
  place?: string;
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
//  *-far = the guess misses by more than FAR_THRESHOLD × price — shown as a double arrow
export type GuessDirection = 'up' | 'down' | 'up-far' | 'down-far' | 'correct';

export interface Guess {
  value: number;
  direction: GuessDirection;
}

export type GameStatus = 'playing' | 'won' | 'lost';

// The player's opinion of the sold price, asked (when the property opts in via
// `priceVerdict`) every time they press Share until they actually vote. Only a real
// vote is saved; skipping/dismissing the verdict sheet is not remembered.
export type Verdict = 'steal' | 'fair' | 'ripoff';

export interface SavedGame {
  slug: string;
  guesses: Guess[];
  status: GameStatus;
  verdict?: Verdict;
}
