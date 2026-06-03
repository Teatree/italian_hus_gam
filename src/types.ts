export interface PropertyConfig {
  // Must match the folder name under public/properties/<slug>.
  slug: string;
  // Where the map is centered. No marker is drawn so the area stays a hint.
  coordinates: { lat: number; lng: number };
  // Reasonable zoom so the player can tell roughly where they are (defaults to 12).
  mapZoom?: number;
  // Exactly 6 image filenames (relative to the property folder), in reveal order.
  images: string[];
  // Facts shown to the player, in reveal order (one more revealed per wrong guess).
  facts: string[];
  // The correct answer (EUR). Never shown as a fact — only revealed at the end.
  soldPrice: number;
}

// Arrow shown next to a guess. The arrow points toward where the real price is:
//  up   = price is higher than your guess (you guessed too low)
//  down = price is lower than your guess (you guessed too high)
//  *-far = the guess is more than 50% away from the price (shown as a double arrow)
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
