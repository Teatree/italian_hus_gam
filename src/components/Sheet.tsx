import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { currentOpener, prefersReducedMotion, trapTab, useScrollLock } from '../lib/motion';

interface SheetProps {
  open: boolean;
  // The player asked to leave without using a button inside: scrim tap, Escape, or dragging
  // the handle down. The owner decides what that means and sets `open` to false.
  onDismiss: () => void;
  // Fired once the closing animation has finished and the sheet is gone.
  onClosed?: () => void;
  // id of the heading that names the dialog.
  labelledBy: string;
  // While true, dismiss gestures are ignored (the verdict sheet, between a vote and its close).
  locked?: boolean;
  // Where the focus lands on open: the sheet's first control (default), or the sheet itself.
  // The verdict sheet uses 'sheet' so that no answer looks pre-selected by a focus ring.
  initialFocus?: 'first-control' | 'sheet';
  children: ReactNode;
}

type Phase = 'closed' | 'entering' | 'open' | 'closing';

// Drag-to-dismiss thresholds: far enough, or fast enough.
const DRAG_DISTANCE = 90; // px
const DRAG_VELOCITY = 0.6; // px per ms

// A bottom sheet over a scrim: slides up in 360ms, slides away in 240ms (app.css). It is a
// modal dialog — focus moves into it and is trapped there, Escape closes it, the page behind
// can't scroll, and focus goes back to whatever opened it. Rendered in a portal on <body>, so
// it sits above the map and the anchor ad whatever the page is doing.
export function Sheet({
  open,
  onDismiss,
  onClosed,
  labelledBy,
  locked = false,
  initialFocus = 'first-control',
  children,
}: SheetProps) {
  const [phase, setPhase] = useState<Phase>('closed');
  const sheetRef = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  // The latest callbacks, so the effects below don't re-run when a parent re-renders.
  const cb = useRef({ onDismiss, onClosed, locked });
  cb.current = { onDismiss, onClosed, locked };

  // Open: mount off-screen, then slide in on the next frames. Close: slide away, then unmount.
  useEffect(() => {
    if (open) {
      if (phase === 'closed' || phase === 'closing') {
        if (phase === 'closed') opener.current = currentOpener();
        setPhase('entering');
      }
    } else if (phase === 'entering' || phase === 'open') {
      setPhase('closing');
    }
    // Driven by `open` alone; `phase` is read, not watched.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (phase === 'entering') {
      let second = 0;
      const first = requestAnimationFrame(() => {
        second = requestAnimationFrame(() => setPhase('open'));
      });
      return () => {
        cancelAnimationFrame(first);
        cancelAnimationFrame(second);
      };
    }
    if (phase === 'closing') {
      const id = window.setTimeout(() => setPhase('closed'), prefersReducedMotion() ? 200 : 240);
      return () => window.clearTimeout(id);
    }
  }, [phase]);

  // Focus: into the sheet on open (its first control, or the sheet itself), back to the opener
  // once closed.
  useEffect(() => {
    if (phase === 'open') {
      const id = window.setTimeout(() => {
        const sheet = sheetRef.current;
        const first =
          initialFocus === 'first-control'
            ? sheet?.querySelector<HTMLElement>('button:not([disabled]), textarea')
            : null;
        (first ?? sheet)?.focus({ preventScroll: true });
      }, 50);
      return () => window.clearTimeout(id);
    }
  }, [phase, initialFocus]);

  const wasMounted = useRef(false);
  useEffect(() => {
    if (phase !== 'closed') {
      wasMounted.current = true;
      return;
    }
    if (!wasMounted.current) return;
    wasMounted.current = false;
    const el = opener.current;
    opener.current = null;
    if (el && document.contains(el)) el.focus({ preventScroll: true });
    cb.current.onClosed?.();
  }, [phase]);

  const mounted = phase !== 'closed';
  useScrollLock(mounted);

  // Escape closes; Tab stays inside.
  useEffect(() => {
    if (!mounted) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        if (!cb.current.locked) cb.current.onDismiss();
        return;
      }
      trapTab(e, sheetRef.current);
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [mounted]);

  // Drag the handle down to dismiss: the sheet follows the finger 1:1 (downward only); past
  // the distance or the speed threshold it closes, otherwise it springs back.
  const drag = useRef<{ y0: number; t0: number; dy: number } | null>(null);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (cb.current.locked) return;
    drag.current = { y0: e.clientY, t0: performance.now(), dy: 0 };
    e.currentTarget.setPointerCapture(e.pointerId);
    sheetRef.current?.classList.add('is-dragging');
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d) return;
    d.dy = Math.max(0, e.clientY - d.y0);
    sheetRef.current?.style.setProperty('--drag', `${d.dy}px`);
  }

  function onPointerEnd() {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    const sheet = sheetRef.current;
    sheet?.classList.remove('is-dragging');
    const velocity = d.dy / Math.max(1, performance.now() - d.t0);
    if (d.dy > DRAG_DISTANCE || velocity > DRAG_VELOCITY) cb.current.onDismiss();
    else sheet?.style.removeProperty('--drag');
  }

  if (!mounted) return null;
  const shown = phase === 'open';

  return createPortal(
    <>
      <div
        className={`scrim${shown ? ' is-shown' : ''}`}
        onClick={() => {
          if (!locked) onDismiss();
        }}
      />
      <div
        ref={sheetRef}
        className={`sheet${shown ? ' is-shown' : ''}${phase === 'closing' ? ' is-closing' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
      >
        <div
          className="sheet__grab"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
        >
          <span className="sheet__handle" />
        </div>
        {children}
      </div>
    </>,
    document.body,
  );
}
