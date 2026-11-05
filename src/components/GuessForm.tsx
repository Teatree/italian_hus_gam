import { useEffect, useId, useRef, useState, type RefObject } from 'react';
import { FAR_THRESHOLD, MIN_GUESS, TOLERANCE } from '../admin';
import { cleanPriceDigits, formatEuro, formatPriceDigits } from '../game/format';
import { prefersReducedMotion, retrigger } from '../lib/motion';
import type { Guess } from '../types';
import { AlertIcon } from './Icons';

interface GuessFormProps {
  guesses: Guess[];
  maxTries: number;
  // The game has just ended: the form lifts and fades out before the result card replaces it.
  leaving: boolean;
  // Called with a valid, not-yet-tried price. Typos and repeats never reach it.
  onSubmit: (value: number) => void;
  // The price field, so the game can keep the keyboard up between guesses and close it at the end.
  inputRef: RefObject<HTMLInputElement>;
}

const pct = (fraction: number) => Math.round(fraction * 100);

// The price field: one tall pill with the € prefix, the input and the Guess button inside it,
// and a helper line underneath. It stays in the same place for the whole game.
//
// Two kinds of slip are caught here and cost no try: a price that is obviously short of the
// full amount, and a price already guessed. Either one shakes the field and explains itself in
// the helper line; the message clears on the next keystroke.
export function GuessForm({ guesses, maxTries, leaving, onSubmit, inputRef }: GuessFormProps) {
  // Digits only; the field shows them with comma grouping ("450,000").
  const [digits, setDigits] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [shakeTick, setShakeTick] = useState(0);
  const fieldRef = useRef<HTMLDivElement>(null);
  const helperId = useId();

  // Replay the shake on every failed submit — after the render that painted the error ring,
  // so React's own className update can't wipe the animation class.
  useEffect(() => {
    if (shakeTick && !prefersReducedMotion()) retrigger(fieldRef.current, 'shake');
  }, [shakeTick]);

  function fail(message: string) {
    setError(message);
    setShakeTick((t) => t + 1);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!digits || leaving) return; // an empty field does nothing
    const value = Number(digits);
    if (value < MIN_GUESS) return fail('Enter the full price, e.g. 450,000');
    if (guesses.some((g) => g.value === value)) return fail(`You already tried ${formatEuro(value)}`);

    setDigits('');
    setError(null);
    // Keep the focus in the field (the Guess button would otherwise take it), so the mobile
    // keyboard stays up for the next guess. If this guess ends the game, the game blurs it.
    inputRef.current?.focus({ preventScroll: true });
    onSubmit(value);
  }

  const lastTry = guesses.length === maxTries - 1;

  return (
    <form className={`guess${leaving ? ' is-leaving' : ''}`} noValidate autoComplete="off" onSubmit={submit}>
      <div
        ref={fieldRef}
        className={`field${digits && !error ? ' has-value' : ''}${error ? ' has-error' : ''}`}
      >
        <span className="field__euro" aria-hidden="true">
          €
        </span>
        <input
          ref={inputRef}
          className="field__input"
          type="text"
          inputMode="numeric"
          enterKeyHint="go"
          autoComplete="off"
          placeholder="Your guess"
          aria-label="Your price guess in euros"
          aria-describedby={helperId}
          aria-invalid={error ? true : undefined}
          value={formatPriceDigits(digits)}
          onChange={(e) => {
            setDigits(cleanPriceDigits(e.target.value));
            setError(null);
          }}
        />
        <button className="field__btn" type="submit" disabled={!digits}>
          Guess
        </button>
      </div>
      <p
        className={`helper${error ? ' is-error' : lastTry ? ' is-last' : ''}`}
        id={helperId}
        aria-live="polite"
      >
        {error ? (
          <>
            <AlertIcon />
            {error}
          </>
        ) : lastTry ? (
          'Last try — make it count'
        ) : (
          `Within ${pct(TOLERANCE)}% wins · ↑ higher · ↓ lower · ↑↑ = ${pct(FAR_THRESHOLD)}%+ off`
        )}
      </p>
    </form>
  );
}
