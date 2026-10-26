import { createContext, useContext, useLayoutEffect } from 'react';
import { HALLOWEEN_FIRST_DAY, HALLOWEEN_LAST_DAY } from '../admin';
import { dateKeyOrder } from '../game/schedule';

// ─────────────────────────────────────────────────────────────────────────────
//  HALLOWEEN DRESS-UP
//  Seasonal theme for the houses dated HALLOWEEN_FIRST_DAY..HALLOWEEN_LAST_DAY (admin.ts).
//  Two halves:
//   • CSS — <html data-theme="halloween"> swaps the palette variables (index.css), darkens the
//     map tiles, and drives the fog/flicker keyframes.
//   • React — useHalloween() lets components swap content (candle hints, tombstone tries,
//     pumpkin pin, Creepster font, candy confetti, ghost rain, cobwebs).
//  Nothing here does anything outside the window, so the code can stay in after Halloween.
// ─────────────────────────────────────────────────────────────────────────────

// True when `slug` is a Halloween house AND the live puzzle day (`todayKey`) hasn't passed the
// last Halloween day yet. The second check is the hard stop: from the 1 November reset the
// theme is gone even on a past-day link to a Halloween house, whatever else is configured.
export function isHalloween(slug: string, todayKey: string): boolean {
  const day = dateKeyOrder(slug);
  const today = dateKeyOrder(todayKey);
  const first = dateKeyOrder(HALLOWEEN_FIRST_DAY);
  const last = dateKeyOrder(HALLOWEEN_LAST_DAY);
  if (day === null || today === null || first === null || last === null) return false;
  return day >= first && day <= last && today <= last;
}

const HalloweenContext = createContext(false);
export const HalloweenProvider = HalloweenContext.Provider;
export const useHalloween = () => useContext(HalloweenContext);

const FONT_HREF = 'https://fonts.googleapis.com/css2?family=Creepster&display=swap';

// Flags <html> for the CSS half of the theme and pulls in the Creepster font — only while
// active, so ordinary days never download it.
export function useHalloweenDocument(active: boolean) {
  useLayoutEffect(() => {
    if (!active) return;
    const root = document.documentElement;
    root.dataset.theme = 'halloween';
    if (!document.querySelector(`link[href="${FONT_HREF}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = FONT_HREF;
      document.head.appendChild(link);
    }
    return () => {
      delete root.dataset.theme;
    };
  }, [active]);
}

// ── Cobweb ──────────────────────────────────────────────────────────────────────────────────
// A corner web anchored at the SVG's top-left: spokes fanning across the quarter circle, joined
// by threads that sag toward the corner. A fixed jitter keeps it from looking machine-drawn.
const SPOKES = 7;
const RINGS = [13, 25, 38, 52, 67, 84];
const JITTER = [0.04, -0.03, 0.05, -0.05, 0.02, -0.04, 0.03];

function buildWebPath(): string {
  const angles = Array.from({ length: SPOKES }, (_, i) => (i / (SPOKES - 1)) * (Math.PI / 2));
  const pt = (r: number, a: number) => `${(r * Math.cos(a)).toFixed(1)} ${(r * Math.sin(a)).toFixed(1)}`;
  let d = angles.map((a) => `M0 0L${pt(120, a)}`).join('');
  RINGS.forEach((r, ri) => {
    for (let i = 0; i < SPOKES - 1; i++) {
      const rr = r * (1 + JITTER[(i + ri) % JITTER.length]);
      const a1 = angles[i];
      const a2 = angles[i + 1];
      d += `M${pt(rr, a1)}Q${pt(rr * 0.82, (a1 + a2) / 2)} ${pt(rr, a2)}`;
    }
  });
  return d;
}

const WEB_PATH = buildWebPath();

// `flip` mirrors it horizontally for a top-right corner.
export function Cobweb({ className, flip }: { className?: string; flip?: boolean }) {
  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden="true"
      className={`pointer-events-none ${className ?? ''}`}
      style={flip ? { transform: 'scaleX(-1)' } : undefined}
    >
      <path
        d={WEB_PATH}
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

// Page-level decoration: cobwebs in the page's top corners (they scroll away with the header)
// and a slow fog bank pinned along the bottom of the viewport. Everything is pointer-events-none
// so it never blocks a click; z-[1020] floats it over Leaflet's panes (~1000) while staying under
// the past-day banner (1050), the verdict popup (1100) and the zoom lightbox.
export function HalloweenDecor() {
  return (
    <div aria-hidden="true">
      <Cobweb className="absolute left-0 top-0 z-[1020] w-24 text-white/30 sm:w-44" />
      <Cobweb className="absolute right-0 top-0 z-[1020] w-24 text-white/30 sm:w-44" flip />
      <div className="halloween-fog pointer-events-none fixed inset-x-0 bottom-0 z-[1020] h-36 overflow-hidden sm:h-44">
        <div className="fog-layer fog-back" />
        <div className="fog-layer fog-front" />
      </div>
    </div>
  );
}
