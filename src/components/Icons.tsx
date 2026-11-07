import { useSeason } from '../theme/season';

// Every icon in the game, drawn as inline SVG so it takes its colour from the tokens and looks
// the same on every device (the old design leaned on emoji). All of them are decorative: the
// control they sit in carries the accessible name.

interface IconProps {
  size?: number;
  className?: string;
}

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

// The clue symbol: a drawn magnifying glass with a tinted lens, a glint, a collar and a thick
// handle. Used in the clue pill, the Clues bar and on every unlocked tile. The glint is left out
// at the small tile size, where it would only muddy the lens.
export function GlassIcon({ size = 22, className }: IconProps) {
  return (
    <svg
      className={`glass ${className ?? ''}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        cx="9.8"
        cy="9.8"
        r="6.6"
        fill="currentColor"
        fillOpacity="0.18"
        stroke="currentColor"
        strokeWidth="2.3"
      />
      {size >= 18 && (
        <path
          d="M6.6 8.6a3.6 3.6 0 0 1 2.9-2.4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.75"
        />
      )}
      <path d="M14.6 14.6l1.6 1.6" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M16.9 16.9l4.3 4.3" stroke="currentColor" strokeWidth="4.2" strokeLinecap="round" />
    </svg>
  );
}

// The clue symbol as the current season wants it: the magnifier, or the season's glyph
// (the Halloween candle).
export function ClueIcon({ size = 22 }: { size?: number }) {
  const glyph = useSeason()?.clueGlyph;
  if (!glyph) return <GlassIcon size={size} />;
  return (
    <span
      className="clue-glyph"
      aria-hidden="true"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.82) }}
    >
      {glyph}
    </span>
  );
}

export function SunIcon({ size = 20, className }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" strokeWidth="2" {...stroke} aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

export function MoonIcon({ size = 20, className }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" strokeWidth="2" {...stroke} aria-hidden="true">
      <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
    </svg>
  );
}

export function CalendarIcon({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth="2" {...stroke} aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}

// Chevron pointing left; `dir="right"` and `dir="down"` are the same stroke turned.
export function ChevronIcon({ size = 20, dir = 'left', className }: IconProps & { dir?: 'left' | 'right' | 'down' }) {
  const d = dir === 'left' ? 'M15 6l-6 6 6 6' : dir === 'right' ? 'M9 6l6 6-6 6' : 'M6 9l6 6 6-6';
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" strokeWidth="2.4" {...stroke} aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

// Zoom button: four outward arrows. Deliberately not a magnifier — the magnifier means "clue".
export function ExpandIcon({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth="2.2" {...stroke} aria-hidden="true">
      <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
    </svg>
  );
}

export function CloseIcon({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth="2.4" {...stroke} aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function CheckIcon({ size = 22, className }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" strokeWidth="3" {...stroke} aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

export function ShareIcon({ size = 20, className }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" strokeWidth="2.2" {...stroke} aria-hidden="true">
      <path d="M12 3v12M7 8l5-5 5 5M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />
    </svg>
  );
}

export function LayersIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth="2.2" {...stroke} aria-hidden="true">
      <path d="M12 3l9 5-9 5-9-5 9-5z" />
      <path d="M3 13l9 5 9-5" />
    </svg>
  );
}

export function LockIcon({ size = 12 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth="2.5" {...stroke} aria-hidden="true">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

export function AlertIcon({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth="2.4" {...stroke} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5M12 16.5v.5" />
    </svg>
  );
}

// Shown in the photo frame when a photo fails to load — never a broken-image icon.
export function HouseIcon({ size = 32 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth="1.8" {...stroke} aria-hidden="true">
      <path d="M3 11.5L12 4l9 7.5M5.5 9.8V20h13V9.8M10 20v-5.5h4V20" />
    </svg>
  );
}

// ── Verdict tiles ───────────────────────────────────────────────────────────────────────────
export function TagIcon({ size = 28 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth="2" {...stroke} aria-hidden="true">
      <path d="M12.6 2.6A2 2 0 0 0 11.2 2H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.7 8.7a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4z" />
      <circle cx="7.5" cy="7.5" r="1.2" />
    </svg>
  );
}

export function ScaleIcon({ size = 28 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth="2" {...stroke} aria-hidden="true">
      <path d="M16 16l3-8 3 8c-.9.7-1.9 1-3 1s-2.1-.3-3-1zM2 16l3-8 3 8c-.9.7-1.9 1-3 1s-2.1-.3-3-1zM7 21h10M12 3v18M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
    </svg>
  );
}

export function WarningIcon({ size = 28 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth="2" {...stroke} aria-hidden="true">
      <path d="M21.7 18l-8-14a2 2 0 0 0-3.5 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3zM12 9v4M12 17h.01" />
    </svg>
  );
}

// The loss rain. Built as a string because the drops are plain DOM nodes spawned outside React
// (src/fx/celebrate.ts).
export const THUMBS_DOWN_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 14V2M9 18.12L10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88z"/></svg>';
