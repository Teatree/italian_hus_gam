import type { Guess } from '../types';

interface TriesRowProps {
  guesses: Guess[];
  maxTries: number;
  isPlaying: boolean;
  // Highest image index that has been revealed (buttons up to here are clickable).
  revealedUpTo: number;
  // Which try's image is currently being viewed.
  selectedIndex: number;
  // After a win, fade unused (idle) buttons to a slightly lighter blue.
  lightenUnused: boolean;
  onSelect: (index: number) => void;
}

// Six buttons representing the tries. Past wrong guesses are red, a winning guess is
// green, the current try (while playing) is highlighted, and the rest are idle/grayed.
// Buttons whose image has been revealed are clickable to view that image; grayed buttons
// (not yet reached) are disabled.
export function TriesRow({
  guesses,
  maxTries,
  isPlaying,
  revealedUpTo,
  selectedIndex,
  lightenUnused,
  onSelect,
}: TriesRowProps) {
  return (
    <div className="flex justify-center gap-2">
      {Array.from({ length: maxTries }, (_, i) => {
        const guess = guesses[i];
        const isActive = isPlaying && i === guesses.length;
        const clickable = i <= revealedUpTo;
        const isSelected = i === selectedIndex;

        // idle / unused — turns a slightly lighter blue once `lightenUnused` is set (post-win)
        let cls = lightenUnused
          ? 'bg-[#26496e] text-slate-200 border-white/10'
          : 'bg-panel text-slate-400 border-white/10';
        if (guess?.direction === 'correct') cls = 'bg-green-600 text-white border-green-400';
        else if (guess) cls = 'bg-red-600 text-white border-red-400';
        else if (isActive) cls = 'bg-sky-500/20 text-sky-200 border-sky-400 ring-2 ring-sky-400';

        const selectedRing = isSelected
          ? ' ring-2 ring-white ring-offset-2 ring-offset-backdrop'
          : '';
        const cursor = clickable ? ' cursor-pointer hover:brightness-110' : ' cursor-not-allowed';

        return (
          <button
            key={i}
            type="button"
            data-testid={`try-${i + 1}`}
            disabled={!clickable}
            aria-pressed={isSelected}
            onClick={() => clickable && onSelect(i)}
            className={`flex h-6 w-6 items-center justify-center rounded-md border text-xs font-semibold transition-colors duration-700 ${cls}${selectedRing}${cursor}`}
          >
            {i + 1}
          </button>
        );
      })}
    </div>
  );
}
