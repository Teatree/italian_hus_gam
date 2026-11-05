import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { FAR_THRESHOLD, MAX_TRIES, RESET_HOUR, TOLERANCE } from '../admin';
import { formatEuro } from '../game/format';
import { prefersReducedMotion } from '../lib/motion';
import type { Verdict } from '../types';
import { ScaleIcon, TagIcon, WarningIcon } from './Icons';
import { Sheet } from './Sheet';

const pct = (fraction: number) => Math.round(fraction * 100);

// ── How to play ─────────────────────────────────────────────────────────────────────────────
// The rules in five lines. The numbers come from src/admin.ts, so the sheet can't drift from
// what the game actually does.
export function HelpSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const titleId = useId();
  const rules: { badge: string; text: string }[] = [
    { badge: '€', text: 'Guess the asking price of today’s casa.' },
    { badge: String(MAX_TRIES), text: `You get ${MAX_TRIES} tries. Land within ±${pct(TOLERANCE)}% to win.` },
    {
      badge: '↑↓',
      text: `↑ go higher, ↓ go lower. Two arrows: you’re more than ${pct(FAR_THRESHOLD)}% off.`,
    },
    { badge: '+1', text: 'Every miss opens one more photo and clue.' },
    {
      badge: String(RESET_HOUR),
      text: `A new casa goes up every day at ${String(RESET_HOUR).padStart(2, '0')}:00.`,
    },
  ];

  return (
    <Sheet open={open} onDismiss={onClose} labelledBy={titleId}>
      <h2 id={titleId}>How to play</h2>
      <ul className="rules">
        {rules.map((rule) => (
          <li key={rule.badge}>
            <span className="rules__badge" aria-hidden="true">
              {rule.badge}
            </span>
            {rule.text}
          </li>
        ))}
      </ul>
      <button className="btn-primary" type="button" onClick={onClose}>
        Let’s play
      </button>
    </Sheet>
  );
}

// ── Price verdict ───────────────────────────────────────────────────────────────────────────
const VERDICTS: { value: Verdict; label: string; icon: ReactNode }[] = [
  { value: 'steal', label: 'Steal', icon: <TagIcon /> },
  { value: 'fair', label: 'Fair', icon: <ScaleIcon /> },
  { value: 'ripoff', label: 'Rip-off', icon: <WarningIcon /> },
];

// How long the chosen tile is shown before the sheet closes.
const VOTE_HOLD_MS = 500;

interface VerdictSheetProps {
  open: boolean;
  // The house's first photo, its price and (when known) its place, for the head row.
  image: string;
  soldPrice: number;
  place: string;
  // A tile was tapped. Fired straight away, inside the tap, so the owner can copy the share
  // text while the browser still counts it as a user gesture.
  onVote: (verdict: Verdict) => void;
  // "Skip and copy result", a scrim tap, Escape or a drag-down: share without a verdict.
  onSkip: () => void;
  // The sheet should close now (VOTE_HOLD_MS after a vote).
  onDone: () => void;
  // The sheet has finished closing.
  onClosed: () => void;
}

// Opened by Share on a house that asks the verdict question, until the player has voted.
// Choosing a tile fills it with the accent and springs it up while the other two dim; half a
// second later the sheet closes, and the owner then shows the "Copied!" feedback.
// This sheet only ever exists after the game has ended, so showing the price here is safe.
export function VerdictSheet({ open, image, soldPrice, place, onVote, onSkip, onDone, onClosed }: VerdictSheetProps) {
  const titleId = useId();
  const [picked, setPicked] = useState<Verdict | null>(null);
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  function pick(verdict: Verdict) {
    if (picked) return;
    setPicked(verdict);
    onVote(verdict);
    timer.current = window.setTimeout(onDone, prefersReducedMotion() ? 0 : VOTE_HOLD_MS);
  }

  return (
    <Sheet
      open={open}
      onDismiss={onSkip}
      onClosed={() => {
        setPicked(null);
        onClosed();
      }}
      labelledBy={titleId}
      locked={picked !== null}
    >
      <div className="verdict__head">
        <img className="verdict__thumb" src={image} alt="" />
        <div className="verdict__facts">
          <span className="verdict__label">ASKING PRICE</span>
          <span className="verdict__price">{formatEuro(soldPrice)}</span>
          {place && <span className="verdict__place">{place}</span>}
        </div>
      </div>
      <div>
        <h2 id={titleId}>Steal, fair or rip-off?</h2>
        <p className="sheet__sub">Your verdict goes into your share, hidden behind a spoiler.</p>
      </div>
      <div className="verdict__opts">
        {VERDICTS.map((option) => (
          <button
            key={option.value}
            className={`verdict__opt${
              picked === option.value ? ' is-chosen' : picked ? ' is-dimmed' : ''
            }`}
            type="button"
            onClick={() => pick(option.value)}
          >
            {option.icon}
            {option.label}
          </button>
        ))}
      </div>
      <button className="btn-text" type="button" disabled={picked !== null} onClick={onSkip}>
        Skip and copy result
      </button>
    </Sheet>
  );
}

// ── Copy fallback ───────────────────────────────────────────────────────────────────────────
// Opens when the browser refuses to copy (no clipboard API, an insecure page, permission
// denied): the share text in a read-only box, already selected, so it can be copied by hand.
export function CopySheet({ text, onClose }: { text: string | null; onClose: () => void }) {
  const titleId = useId();
  const boxRef = useRef<HTMLTextAreaElement>(null);
  // Keep the text on screen while the sheet slides away.
  const lastText = useRef('');
  if (text !== null) lastText.current = text;

  useEffect(() => {
    if (text === null) return;
    // After the sheet's own focus move, so the selection sticks.
    const id = window.setTimeout(() => {
      boxRef.current?.focus({ preventScroll: true });
      boxRef.current?.select();
    }, 120);
    return () => window.clearTimeout(id);
  }, [text]);

  return (
    <Sheet open={text !== null} onDismiss={onClose} labelledBy={titleId}>
      <div>
        <h2 id={titleId}>Copy your result</h2>
        <p className="sheet__sub">
          Your browser blocked automatic copying. Select the text below and copy it.
        </p>
      </div>
      <textarea
        ref={boxRef}
        className="copy-box"
        readOnly
        value={lastText.current}
        aria-label="Your result"
        onFocus={(e) => e.currentTarget.select()}
      />
      <button className="btn-primary" type="button" onClick={onClose}>
        Done
      </button>
    </Sheet>
  );
}
