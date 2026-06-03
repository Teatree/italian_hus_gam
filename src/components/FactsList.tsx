import { useEffect, useRef, useState } from 'react';

interface FactsListProps {
  facts: string[]; // facts to show; index == the try that revealed the fact
  // Fact index to highlight (matches the currently-selected try), or null for none.
  highlightIndex: number | null;
  // When true, reveal facts one-by-one (used on win to show all remaining hints).
  stagger?: boolean;
}

export function FactsList({ facts, highlightIndex, stagger = false }: FactsListProps) {
  const [shownCount, setShownCount] = useState(0);
  const shownRef = useRef(0);
  shownRef.current = shownCount;

  useEffect(() => {
    if (!stagger) {
      setShownCount(facts.length);
      return;
    }
    // Reveal remaining facts one at a time, starting from whatever is already shown.
    const start = shownRef.current;
    if (start >= facts.length) {
      setShownCount(facts.length);
      return;
    }
    const timers: number[] = [];
    for (let target = start + 1; target <= facts.length; target++) {
      timers.push(window.setTimeout(() => setShownCount(target), (target - start) * 450));
    }
    return () => timers.forEach((t) => clearTimeout(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stagger, facts.length]);

  // Newest hint on top. Each <li> animates once when it first mounts (`hint-new`).
  const ordered = facts
    .slice(0, shownCount)
    .map((fact, i) => ({ fact, i }))
    .reverse();

  return (
    <ul className="space-y-1.5">
      {ordered.map(({ fact, i }) => {
        const isHighlighted = i === highlightIndex;
        return (
          <li
            key={i}
            data-testid={`fact-${i}`}
            className={`hint-new flex items-center gap-2 rounded-md border bg-panel px-3 py-2 text-sm text-slate-100 transition-colors ${
              isHighlighted ? 'border-sky-400 ring-1 ring-sky-400' : 'border-transparent'
            }`}
          >
            <span aria-hidden="true">💡</span>
            <span>{fact}</span>
          </li>
        );
      })}
    </ul>
  );
}
