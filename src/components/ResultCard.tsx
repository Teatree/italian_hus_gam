import { useEffect, useRef, useState } from 'react';
import { formatEuro } from '../game/format';
import { prefersReducedMotion } from '../lib/motion';
import { CheckIcon, ShareIcon } from './Icons';
import { Countdown } from './Countdown';

interface ResultCardProps {
  outcome: 'win' | 'exact' | 'loss';
  soldPrice: number;
  // The line under the price ("You were 3% off · solved on try 4").
  summary: string;
  propertyUrl: string;
  // True when the game ended a moment ago in this session: the card rises, the title stamps
  // in and the price counts up. False for a finished game restored from storage — it simply
  // appears in its final state, with no entrance and no count-up.
  live: boolean;
  // "Copied!" feedback on the Share button.
  copied: boolean;
  onShare: () => void;
  // Epoch ms of the next reset; null on a past-day link, where the countdown is left out.
  nextResetMs: number | null;
}

const TITLE = {
  win: 'Good job!',
  exact: 'Right on the money!',
  loss: 'You suck!',
};

// Counts from €0 up to `to` over `ms` (easeOutCubic), starting `delay` ms from now, in €1,000
// steps, and lands exactly on the price. Returns the value to show.
function useCountUp(to: number, enabled: boolean, ms = 900, delay = 200): number {
  const [value, setValue] = useState(enabled ? 0 : to);
  useEffect(() => {
    if (!enabled) return;
    let raf = 0;
    const t0 = performance.now() + delay;
    const step = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - t0) / ms));
      const eased = 1 - Math.pow(1 - t, 3);
      if (t < 1) {
        setValue(Math.round((to * eased) / 1000) * 1000);
        raf = requestAnimationFrame(step);
      } else {
        setValue(to);
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, enabled, ms, delay]);
  return value;
}

// The result card takes the price field's place when the game ends. This is the first place
// the price ever appears on the page: it is not rendered, in any form, before the game is over.
export function ResultCard({
  outcome,
  soldPrice,
  summary,
  propertyUrl,
  live,
  copied,
  onShare,
  nextResetMs,
}: ResultCardProps) {
  // Decided once, when the card appears.
  const [animate] = useState(() => live && !prefersReducedMotion());
  const shown = useCountUp(soldPrice, animate);
  const ref = useRef<HTMLElement>(null);

  // Once the card has entered, make sure the Share button is on screen.
  useEffect(() => {
    if (!live) return;
    const id = window.setTimeout(() => {
      ref.current?.scrollIntoView({ block: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    }, 120);
    return () => window.clearTimeout(id);
  }, [live]);

  return (
    <section
      ref={ref}
      className={`result is-${outcome}${animate ? ' is-entering' : ''}`}
      aria-live="polite"
      data-testid="result"
    >
      <h2 className="result__title" data-testid="result-banner">
        {TITLE[outcome]}
      </h2>
      <span className="result__label">ASKING PRICE</span>
      {/* The counting figure is for the eyes only; assistive tech gets the final price once. */}
      <span className="result__price" aria-hidden="true">
        {formatEuro(shown)}
      </span>
      <span className="sr-only">{formatEuro(soldPrice)}</span>
      <span className="result__line">{summary}</span>
      <button className={`result__share${copied ? ' is-copied' : ''}`} type="button" onClick={onShare}>
        <ShareIcon className="i-share" />
        <CheckIcon className="i-check" size={20} />
        <span>{copied ? 'Copied!' : 'Share result'}</span>
      </button>
      <div className="result__row">
        <a href={propertyUrl} target="_blank" rel="noopener noreferrer">
          View listing ↗
        </a>
        {nextResetMs !== null && (
          <span>
            Next casa <Countdown targetMs={nextResetMs} />
          </span>
        )}
      </div>
    </section>
  );
}
