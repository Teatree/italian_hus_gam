import type { GuessDirection } from '../types';

// Decide how a guess compares to the correct price. The arrow points toward where the
// real price is relative to the guess:
//  - within the win margin    -> 'correct' (the player wins)
//  - guess too low  (price higher) -> 'up'   (or 'up-far'   if it misses by more than the far margin)
//  - guess too high (price lower)  -> 'down' (or 'down-far' if it misses by more than the far margin)
// Both margins are pure percentages of the price: the win margin is ±tolerance, and the far
// margin (single vs double arrow) is ±farFraction.
export function evaluateGuess(
  guess: number,
  correct: number,
  tolerance: number,
  farFraction: number,
): GuessDirection {
  const delta = guess - correct;
  const margin = correct * tolerance;
  if (Math.abs(delta) <= margin) return 'correct';

  const farMargin = correct * farFraction;
  const far = Math.abs(delta) > farMargin;
  if (delta < 0) {
    // guessed below the price -> price is higher -> point up
    return far ? 'up-far' : 'up';
  }
  // guessed above the price -> price is lower -> point down
  return far ? 'down-far' : 'down';
}

// Absolute percentage the guess is away from the exact price, rounded to a whole number.
export function percentOff(guess: number, correct: number): number {
  return Math.round((Math.abs(guess - correct) / correct) * 100);
}

// How many images/facts are revealed given the number of wrong guesses so far.
// Starts at 1 (before any guess) and grows by one per wrong guess, capped at maxTries.
export function revealedCount(wrongGuesses: number, maxTries: number): number {
  return Math.min(wrongGuesses + 1, maxTries);
}
