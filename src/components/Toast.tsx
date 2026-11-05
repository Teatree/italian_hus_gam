import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckIcon } from './Icons';

interface ToastProps {
  // Bump to show the toast. Bumping again while it is up just restarts its timer, so toasts
  // never stack.
  tick: number;
  message: string;
  // How long it stays up.
  duration?: number;
}

type Phase = 'idle' | 'shown' | 'hiding';

// A pill that drops in at the top of the screen and leaves by itself. It is a status region,
// so screen readers announce the message without moving focus. Lives in a portal on <body>,
// above every other layer.
export function Toast({ tick, message, duration = 2500 }: ToastProps) {
  const [phase, setPhase] = useState<Phase>('idle');

  useEffect(() => {
    if (tick === 0) return;
    setPhase('shown');
    let gone = 0;
    const hide = window.setTimeout(() => {
      setPhase('hiding');
      gone = window.setTimeout(() => setPhase('idle'), 200);
    }, duration);
    return () => {
      window.clearTimeout(hide);
      window.clearTimeout(gone);
    };
  }, [tick, duration]);

  return createPortal(
    <div
      className={`toast${phase === 'shown' ? ' is-shown' : ''}${phase === 'hiding' ? ' is-hiding' : ''}`}
      role="status"
      aria-live="polite"
    >
      {phase !== 'idle' && (
        <>
          <CheckIcon size={16} />
          {message}
        </>
      )}
    </div>,
    document.body,
  );
}
