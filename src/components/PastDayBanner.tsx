import { formatDateKey } from '../game/schedule';
import { todayUrl } from '../game/dayLink';

interface PastDayBannerProps {
  // The DD_MM_YY slug of the past puzzle being shown.
  dateKey: string;
}

// Pinned to the top while a shared link has opened a previous day's house, so it can never be
// mistaken for today's puzzle. z-index sits above Leaflet's panes (~1000) but below the
// verdict popup (1100) and the zoom lightbox.
export function PastDayBanner({ dateKey }: PastDayBannerProps) {
  return (
    <div
      role="status"
      data-testid="past-day-banner"
      className="sticky top-0 z-[1050] -mx-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-b-4 border-amber-600 bg-amber-400 px-4 py-3 text-center text-slate-900 shadow-lg shadow-black/40"
    >
      <p className="leading-tight">
        <span className="block text-xs font-extrabold uppercase tracking-widest">
          ⏪ Past puzzle — not today's house
        </span>
        <span className="block text-lg font-bold">{formatDateKey(dateKey)}</span>
      </p>
      <a
        href={todayUrl()}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-amber-300 transition-colors hover:bg-slate-800"
      >
        Play today's house →
      </a>
    </div>
  );
}
