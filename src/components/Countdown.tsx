import { useEffect, useState } from 'react';

const pad = (n: number) => String(n).padStart(2, '0');

function remainingText(targetMs: number): string {
  const total = Math.max(0, Math.floor((targetMs - Date.now()) / 1000));
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
}

// Time left until `targetMs` as "HH:MM:SS", re-read from the clock on every tick so it can
// never drift. The interval doesn't run while the tab is hidden; coming back to the tab
// recomputes at once instead of waiting for the next tick (a tab left open for hours shows
// the right time the moment it is looked at).
export function useCountdown(targetMs: number): string {
  const [text, setText] = useState(() => remainingText(targetMs));

  useEffect(() => {
    let id = 0;
    const tick = () => setText(remainingText(targetMs));
    const start = () => {
      window.clearInterval(id);
      tick();
      if (!document.hidden) id = window.setInterval(tick, 1000);
    };
    start();
    document.addEventListener('visibilitychange', start);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', start);
    };
  }, [targetMs]);

  return text;
}

interface CountdownProps {
  // Epoch ms of the next daily reset.
  targetMs: number;
  className?: string;
}

// The live countdown to the next casa, in tabular figures so its width never jitters.
export function Countdown({ targetMs, className }: CountdownProps) {
  const text = useCountdown(targetMs);
  return <b className={`tabular ${className ?? ''}`}>{text}</b>;
}
