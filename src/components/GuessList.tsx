import type { Guess } from '../types';
import { formatEuro } from '../game/format';

interface GuessListProps {
  guesses: Guess[];
}

// The arrow points toward the real price. A double arrow means more than 50% off.
//  up   = price is higher than your guess   |  down   = price is lower than your guess
function arrow(direction: Guess['direction']): string {
  switch (direction) {
    case 'up':
      return '⬆️';
    case 'up-far':
      return '⬆️⬆️';
    case 'down':
      return '⬇️';
    case 'down-far':
      return '⬇️⬇️';
    case 'correct':
      return '✅';
  }
}

export function GuessList({ guesses }: GuessListProps) {
  if (guesses.length === 0) return null;

  return (
    <ul className="space-y-1.5">
      {guesses.map((g, i) => (
        <li
          key={i}
          className="flex items-center justify-between rounded-md bg-panel px-3 py-2 text-sm"
        >
          <span className="font-medium text-white">{formatEuro(g.value)}</span>
          <span className="text-lg leading-none">{arrow(g.direction)}</span>
        </li>
      ))}
    </ul>
  );
}
