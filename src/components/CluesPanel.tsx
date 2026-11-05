import { useEffect, useId, useRef, useState } from 'react';
import { prefersReducedMotion } from '../lib/motion';
import { ChevronIcon, ClueIcon, LockIcon } from './Icons';

interface CluesPanelProps {
  // Exactly one clue per try, in reveal order.
  clues: string[];
  // How many clues are unlocked: one more per wrong guess during play, all of them once over.
  revealed: number;
  // The clue whose photo is on screen (its tile wears the accent ring).
  viewedIndex: number;
  isPlaying: boolean;
  // True only when the game ended live in this session: the remaining shutters then open one
  // after another instead of all at once.
  cascade: boolean;
  open: boolean;
  onToggle: () => void;
  onSelect: (index: number) => void;
}

// How far apart the remaining clues open at the end of a game.
const CASCADE_MS = 450;

// The collapsible Clues panel. Collapsed on every visit; the bar shows how many clues are
// unlocked as a count and six dots. Inside are always six tiles of one fixed height, so the
// panel — and everything below it — never changes height when a clue unlocks.
//
// A locked clue sits behind closed window shutters, and its text is not in the page at all
// until it unlocks. Unlocking swings the shutters open (the signature animation, driven by the
// `is-open` class in app.css); with the panel collapsed the tile just switches, silently.
export function CluesPanel({
  clues,
  revealed,
  viewedIndex,
  isPlaying,
  cascade,
  open,
  onToggle,
  onSelect,
}: CluesPanelProps) {
  const panelId = useId();
  // How many tiles are open right now. It follows `revealed`, except at the end of a live
  // game, where it steps up one tile every CASCADE_MS.
  const [openCount, setOpenCount] = useState(revealed);
  // The first tile that was opened after this page load. Tiles (and dots) from here on animate
  // in; anything already open when the game was restored just appears.
  const [liveFrom] = useState(revealed);
  const countRef = useRef(openCount);
  countRef.current = openCount;

  useEffect(() => {
    const from = countRef.current;
    if (revealed <= from) {
      if (revealed < from) setOpenCount(revealed);
      return;
    }
    if (!cascade || prefersReducedMotion()) {
      setOpenCount(revealed);
      return;
    }
    const timers: number[] = [];
    for (let target = from + 1; target <= revealed; target++) {
      const delay = (target - from - 1) * CASCADE_MS;
      if (delay === 0) setOpenCount(target);
      else timers.push(window.setTimeout(() => setOpenCount(target), delay));
    }
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [revealed, cascade]);

  return (
    <section className={`clues${open ? ' is-open' : ''}`}>
      <button
        className="clues__bar"
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
      >
        <ClueIcon size={22} />
        <span className="clues__title">Clues</span>
        <span className="clues__count">
          {revealed} of {clues.length}
        </span>
        <span className="clues__dots" aria-hidden="true">
          {clues.map((_, i) => (
            <span
              key={i}
              className={`clues__dot${i < openCount ? ' is-on' : ''}${i < openCount && i >= liveFrom ? ' pop' : ''}`}
            />
          ))}
        </span>
        <ChevronIcon dir="down" className="clues__chev" />
      </button>

      <div className="clues__panel" id={panelId}>
        <div className="clues__inner" aria-hidden={!open}>
          <div className="clues__grid">
            {clues.map((clue, i) => {
              const isOpen = i < openCount;
              // "NEW" marks the newest clue while the game is still going (not the first one).
              const isNew = isPlaying && revealed > 1 && i === revealed - 1;
              const cls = [
                'tile',
                isOpen && 'is-open',
                isOpen && i === viewedIndex && 'is-sel',
                isOpen && isNew && 'is-new',
                isOpen && i >= liveFrom && 'is-fresh',
              ]
                .filter(Boolean)
                .join(' ');

              return (
                <div
                  key={i}
                  className={cls}
                  role={isOpen ? undefined : 'img'}
                  aria-label={isOpen ? undefined : `Clue ${i + 1}, locked`}
                >
                  <button
                    className="tile__content"
                    type="button"
                    title={isOpen ? clue : undefined}
                    tabIndex={isOpen && open ? 0 : -1}
                    disabled={!isOpen}
                    aria-hidden={!isOpen}
                    aria-current={isOpen && i === viewedIndex ? 'true' : undefined}
                    onClick={() => onSelect(i)}
                  >
                    <span className="tile__num">
                      <ClueIcon size={14} />
                      <span className="tile__label">CLUE {i + 1}</span>
                      <span className="tile__new">NEW</span>
                    </span>
                    {/* A locked clue's text is not rendered at all. */}
                    <span className="tile__text">{isOpen ? clue : ''}</span>
                  </button>
                  <div className="shutter" aria-hidden="true">
                    <span className="shutter__leaf shutter__leaf--l" />
                    <span className="shutter__leaf shutter__leaf--r" />
                    <span className="shutter__lock">
                      <LockIcon />
                      Clue {i + 1}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
