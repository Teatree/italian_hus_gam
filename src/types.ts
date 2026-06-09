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
