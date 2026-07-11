import { useState } from 'react';
import type { Verdict } from '../types';
import { formatEuro } from '../game/format';
import { Lightbox } from './ImageViewer';

interface VerdictPopupProps {
  soldPrice: number;
  // The property's first photo, featured at the top of the card. Clicking it opens the same
  // full-screen lightbox as on the game page, stacked ABOVE this popup — closing the lightbox
  // returns here.
  image: string;
  // "this property" in the question links to the listing.
  propertyUrl: string;
  onVote: (verdict: Verdict) => void;
  // Share without voting — fired by the "skip" link or a backdrop click. Deliberately
  // NOT remembered: the popup returns on every Share until the player actually votes.
  onSkip: () => void;
}

const OPTIONS: { value: Verdict; emoji: string; label: string }[] = [
  { value: 'steal', emoji: '🤑', label: 'Steal' },
  { value: 'fair', emoji: '🤝', label: 'Fair' },
  { value: 'ripoff', emoji: '🚨', label: 'Rip-off' },
];

// "The Ballot": shown when the player presses Share on a property with `priceVerdict`
// enabled and hasn't voted yet. The chosen card pops while the others fade, then the popup
// closes itself and the share text (with the verdict line) is copied by the caller.
export function VerdictPopup({ soldPrice, image, propertyUrl, onVote, onSkip }: VerdictPopupProps) {
  const [picked, setPicked] = useState<Verdict | null>(null);
  const [zoomed, setZoomed] = useState(false);

  function pick(verdict: Verdict) {
    if (picked) return;
    setPicked(verdict);
    window.setTimeout(() => onVote(verdict), 500);
  }

  return (
    <>
      {/* z-[1100] keeps the overlay above Leaflet's panes/controls (which go up to z-index 1000). */}
      <div
        className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/60 p-4"
        onClick={() => picked || onSkip()}
        role="dialog"
        aria-modal="true"
        aria-label="What do you think of the price?"
      >
        <div
          className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-slate-700 bg-slate-800 text-center shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => setZoomed(true)}
            aria-label="Expand house photo to full screen"
            className="block w-full cursor-zoom-in"
          >
            <img src={image} alt="House photo" className="aspect-[4/3] w-full object-cover" />
          </button>

          <div className="p-6">
            <p className="text-3xl font-extrabold text-green-400">{formatEuro(soldPrice)}</p>

            {/* Tassos asks the question. His portrait spans the full height of the left side
                (nudged 20px further left, visually only — the layout doesn't follow); the
                bubble and the verdict cards live in the column to his right, with the bubble
                deliberately overlapping the portrait so it sits close to his face. The cards
                are pinned to the column bottom so their lower edge lines up with his. */}
            <div className="mt-4 flex text-left">
              <img
                src="/Tassos_speaks.png"
                alt="Tassos, the agent"
                className="relative -left-[13px] w-36 shrink-0 self-start"
              />
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="relative z-10 -ml-9 mt-1 rounded-lg bg-slate-700 p-3 text-slate-100 shadow-lg">
                  {/* The bubble's tail, pointing at Tassos. */}
                  <span
                    aria-hidden="true"
                    className="absolute -left-1.5 top-1/2 h-3 w-3 -translate-y-1/2 rotate-45 bg-slate-700"
                  />
                  What do you think of the price for{' '}
                  <a
                    href={propertyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-400 underline underline-offset-2 hover:text-sky-300"
                  >
                    this property
                  </a>
                  ?
                </div>

                <p className="mt-auto pt-3 text-xs font-medium text-slate-400">Choose:</p>
                <div className="mt-1 flex justify-end gap-2">
                  {OPTIONS.map((o) => (
                    <button
                      key={o.value}
                      onClick={() => pick(o.value)}
                      className={`w-20 rounded-lg border px-1 py-2.5 transition-all duration-300 ${
                        picked === o.value
                          ? 'scale-110 border-green-400 bg-slate-700'
                          : picked
                            ? 'border-slate-700 opacity-30'
                            : 'border-slate-600 bg-slate-700/50 hover:border-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      <span className="block text-2xl">{o.emoji}</span>
                      <span className="mt-1 block text-sm font-semibold text-slate-200">{o.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={onSkip}
              disabled={picked !== null}
              className="mt-5 text-sm text-slate-400 underline underline-offset-2 hover:text-slate-300"
            >
              skip →
            </button>
          </div>
        </div>
      </div>

      {/* Rendered as a sibling of the overlay so its close click never bubbles into onSkip. */}
      {zoomed && <Lightbox src={image} alt="House photo" onClose={() => setZoomed(false)} />}
    </>
  );
}
