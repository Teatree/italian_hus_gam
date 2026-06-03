import { useEffect, useState } from 'react';

const pad = (n: number) => String(n).padStart(2, '0');

interface NewGameTimerProps {
  // Epoch ms of the next reset; the countdown ticks down to this.
  targetMs: number;
}

// A live countdown to the next daily reset, shown as "New Game in 12h 32m 09s".
export function NewGameTimer({ targetMs }: NewGameTimerProps) {
  const [remaining, setRemaining] = useState(() => Math.max(0, targetMs - Date.now()));

  useEffect(() => {
    setRemaining(Math.max(0, targetMs - Date.now()));
    const id = window.setInterval(() => {
      setRemaining(Math.max(0, targetMs - Date.now()));
    }, 1000);
    return () => window.clearInterval(id);
  }, [targetMs]);

  const total = Math.floor(remaining / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;

  return (
    <p className="text-center text-sm text-slate-300">
      New Game in{' '}
      <span className="font-bold text-white">
        {pad(h)}h {pad(m)}m {pad(s)}s
      </span>
    </p>
  );
}
