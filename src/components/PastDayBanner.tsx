import { formatDateKeyShort } from '../game/schedule';
import { todayUrl } from '../game/dayLink';
import { CalendarIcon } from './Icons';

interface PastDayBannerProps {
  // The DD_MM_YY slug of the past house being shown.
  dateKey: string;
}

// Pinned to the top, edge to edge, while a shared link has opened a previous day's house, so
// it can never be mistaken for today's. Sits above the map (Leaflet goes up to 1000) and below
// every sheet, the zoom and the toast.
export function PastDayBanner({ dateKey }: PastDayBannerProps) {
  return (
    <div className="pastday" role="status" data-testid="past-day-banner">
      <CalendarIcon />
      <span className="pastday__text">Casa from {formatDateKeyShort(dateKey)}</span>
      <a className="pastday__btn" href={todayUrl()}>
        Today’s casa →
      </a>
    </div>
  );
}
