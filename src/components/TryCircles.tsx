import { TOLERANCE } from '../admin';
import { formatEuro, formatShortEuro } from '../game/format';
import type { Guess, GuessDirection } from '../types';
import { CheckIcon } from './Icons';

type TryState = 'now' | 'wrong' | 'right' | 'locked' | 'unused';

interface TryCirclesProps {
  guesses: Guess[];
  maxTries: number;
  isOver: boolean;
  // Which try's photo is on screen, and which try is "current" (the one being played, or the
  // one the game ended on). The white ring marks the viewed try when it isn't simply the
  // current one — and always after the game, as the carousel moves along.
  viewedIndex: number;
  currentIndex: number;
  // After a win the tries that were never needed fade to the quieter "unused" look. It lags
  // 2 seconds behind a live win; a restored game starts with it already on.
  unusedReady: boolean;
  // The try whose guess landed a moment ago (it plays the arrow/check pop, and the next circle
  // bounces in as "now"); null when nothing is animating.
  justGuessed: number | null;
  onSelect: (index: number) => void;
}

// The arrow points toward the real price; a double arrow means the guess is more than
// FAR_THRESHOLD off. (The comparison itself is evaluateGuess in src/game/logic.ts.)
const ARROW: Record<Exclude<GuessDirection, 'correct'>, string> = {
  up: '↑',
  'up-far': '↑↑',
  down: '↓',
  'down-far': '↓↓',
};

const WORDS: Record<Exclude<GuessDirection, 'correct'>, string> = {
  up: 'too low',
  'up-far': 'far too low',
  down: 'too high',
  'down-far': 'far too high',
};

// Spoken description of a wrong guess, shared with the game's screen-reader announcement.
export function directionWords(direction: GuessDirection): string {
  return direction === 'correct' ? `within ${Math.round(TOLERANCE * 100)}%` : WORDS[direction];
}

// The six try circles. They are the guess history too: the direction arrow (or the check) sits
// inside the circle and the guessed value underneath, and they stay on screen after the game.
// Past tries and the current one can be tapped to look at that try's photo and clue; tries
// that haven't been reached are disabled until the game is over.
export function TryCircles({
  guesses,
  maxTries,
  isOver,
  viewedIndex,
  currentIndex,
  unusedReady,
  justGuessed,
  onSelect,
}: TryCirclesProps) {
  const n = guesses.length;

  return (
    <ol className="tries" aria-label="Your six tries">
      {Array.from({ length: maxTries }, (_, i) => {
        const guess: Guess | undefined = guesses[i];
        let state: TryState;
        if (guess) state = guess.direction === 'correct' ? 'right' : 'wrong';
        else if (!isOver) state = i === n ? 'now' : 'locked';
        else state = unusedReady ? 'unused' : 'locked';

        const enabled = isOver || i <= n;
        const viewed = i === viewedIndex;
        const ringed = viewed && (isOver || viewedIndex !== currentIndex);
        const last = !isOver && n === maxTries - 1 && i === maxTries - 1;

        let label: string;
        if (guess) label = `Try ${i + 1}: ${formatEuro(guess.value)}, ${directionWords(guess.direction)}`;
        else if (state === 'now') label = `Try ${i + 1}, current`;
        else label = `Try ${i + 1}, ${isOver ? 'unused' : 'locked'}`;

        const cls = [
          'try',
          justGuessed === i && 'pop',
          justGuessed !== null && justGuessed + 1 === i && state === 'now' && 'now-in',
          ringed && 'is-ringed',
          last && 'is-last',
        ]
          .filter(Boolean)
          .join(' ');

        return (
          <li key={i}>
            <button
              className={cls}
              type="button"
              data-state={state}
              data-testid={`try-${i + 1}`}
              disabled={!enabled}
              aria-label={label}
              aria-current={viewed ? 'true' : undefined}
              onClick={() => onSelect(i)}
            >
              <span className="try__circle" aria-hidden="true">
                <span className="try__num">{i + 1}</span>
                <span className="try__arrow">
                  {guess && guess.direction !== 'correct' ? ARROW[guess.direction] : ''}
                </span>
                <CheckIcon className="try__check" />
              </span>
              <span className="try__label" aria-hidden="true">
                {guess ? formatShortEuro(guess.value) : state === 'now' ? 'now' : '–'}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
