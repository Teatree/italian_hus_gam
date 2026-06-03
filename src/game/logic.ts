import type { GuessDirection } from '../types';

// Decide how a guess compares to the correct price. The arrow points toward where the
// real price is relative to the guess:
//  - within ±tolerance       -> 'correct' (the player wins)
//  - guess too low  (price higher) -> 'up'   (or 'up-far'   if more than 50% off)
//  - guess too high (price lower)  -> 'down' (or 'down-far' if more than 50% off)
export function evaluateGuess(
  guess: number,
  correct: number,
  tolerance: number,
): GuessDirection {
  const delta = guess - correct;
  if (Math.abs(delta) <= correct * tolerance) return 'correct';

  const far = Math.abs(delta) > correct * 0.5;
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
