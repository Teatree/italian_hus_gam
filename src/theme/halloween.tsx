// ─────────────────────────────────────────────────────────────────────────────
//  HALLOWEEN — the pieces only this season uses
//  The palette is the [data-season="halloween"] block in src/styles/tokens.css; when and how
//  the season switches on is in src/theme/season.tsx. This file holds its decorations:
//  cobwebs, the fog bank, the candle-flicker and the pumpkin map pin.
// ─────────────────────────────────────────────────────────────────────────────

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

// Drawn for a top-left corner; the CSS mirrors it for a top-right one.
function Cobweb({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" className={`cobweb ${className ?? ''}`}>
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

// Page-level layers: cobwebs in the corners just under the awning (they scroll away with the
// header) and a slow fog bank pinned along the bottom of the viewport. Both sit behind the
// game column and ignore the pointer, so they can never cover or block anything.
export function HalloweenDecor() {
  return (
    <>
      <div className="season-decor" aria-hidden="true">
        <Cobweb className="cobweb--l" />
        <Cobweb className="cobweb--r" />
      </div>
      <div className="season-fog" aria-hidden="true">
        <div className="fog-layer fog-back" />
        <div className="fog-layer fog-front" />
      </div>
    </>
  );
}

// A smaller web inside the photo frame (top-right: the clue pill owns the top-left corner).
export function HalloweenPhotoDecor() {
  return <Cobweb />;
}

// Candle-flicker: the photo gutters dark, sputters warm a couple of times, then steadies.
export const CANDLE_FLICKER: { frames: Keyframe[]; duration: number } = {
  duration: 900,
  frames: [
    { filter: 'brightness(0.1)', offset: 0 },
    { filter: 'brightness(0.85) sepia(0.5)', offset: 0.12 },
    { filter: 'brightness(0.3) sepia(0.6)', offset: 0.22 },
    { filter: 'brightness(1.1) sepia(0.35)', offset: 0.38 },
    { filter: 'brightness(0.55) sepia(0.45)', offset: 0.5 },
    { filter: 'brightness(1.05) sepia(0.2)', offset: 0.7 },
    { filter: 'brightness(1) sepia(0)', offset: 1 },
  ],
};

// Map pin: a jack-o'-lantern sitting on the property's location.
export const PUMPKIN_PIN = {
  size: [40, 40] as [number, number],
  anchor: [20, 38] as [number, number],
  html: `<svg viewBox="0 0 64 64" width="40" height="40" xmlns="http://www.w3.org/2000/svg">
  <path d="M31 16 Q31 7 38 4" stroke="#4d7c0f" stroke-width="5" fill="none" stroke-linecap="round"/>
  <ellipse cx="20" cy="38" rx="15" ry="21" fill="#c2410c"/>
  <ellipse cx="44" cy="38" rx="15" ry="21" fill="#c2410c"/>
  <ellipse cx="32" cy="38" rx="15" ry="23" fill="#f97316"/>
  <polygon points="19,34 28,34 23.5,26" fill="#fde047"/>
  <polygon points="36,34 45,34 40.5,26" fill="#fde047"/>
  <path d="M18 42 L23 46 L27 43 L32 47 L37 43 L41 46 L46 42 Q44 53 32 54 Q20 53 18 42 Z" fill="#fde047"/>
</svg>`,
};
