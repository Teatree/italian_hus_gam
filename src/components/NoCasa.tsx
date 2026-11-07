import { RESET_HOUR } from '../admin';
import { dayUrl } from '../game/dayLink';
import { Countdown } from './Countdown';

interface NoCasaProps {
  // Epoch ms of the next daily reset.
  targetMs: number;
  // Yesterday's slug, when yesterday had a house to play; otherwise the button is left out.
  yesterday: string | null;
}

// Shown in place of the game when no house is scheduled for the day: closed shutters, a short
// line, a big countdown, and a way to play yesterday's house instead of a dead end.
export function NoCasa({ targetMs, yesterday }: NoCasaProps) {
  return (
    <section className="no-casa">
      <div className="no-casa__shutters" aria-hidden="true">
        <span />
        <span />
      </div>
      <h2>No casa today</h2>
      <p>
        The agent is on siesta. A fresh casa goes up for sale at {String(RESET_HOUR).padStart(2, '0')}:00.
      </p>
      <Countdown targetMs={targetMs} className="no-casa__clock" />
      {yesterday && <a href={dayUrl(yesterday)}>Play yesterday’s casa</a>}
    </section>
  );
}
