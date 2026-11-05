import { useEffect, useLayoutEffect, useState } from 'react';

// True when the player asked the OS for less motion. Read at the moment an effect is about to
// run, so flipping the setting takes effect without a reload.
export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// The same setting as React state, for the few places that render differently because of it.
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(prefersReducedMotion);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

// Restart a CSS keyframe animation by re-adding its class. The class is owned by this helper,
// not by React's className, so only use it for a class no render ever sets.
export function retrigger(el: Element | null, cls: string): void {
  if (!el) return;
  el.classList.remove(cls);
  void (el as HTMLElement).offsetWidth; // force a reflow so the animation starts over
  el.classList.add(cls);
}

// True for the first two animation frames after mount, false from then on. The app root wears
// `no-anim` while it is true, so nothing transitions or animates on first paint — a restored
// game simply appears in its saved state.
export function useBooting(): boolean {
  const [booting, setBooting] = useState(true);
  useEffect(() => {
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setBooting(false));
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, []);
  return booting;
}

// ── Scroll lock for dialogs ─────────────────────────────────────────────────────────────────
// Counted, so a sheet opening over another overlay doesn't release the lock early. The page
// keeps its width while the scrollbar is gone, so nothing shifts sideways on desktop.
let locks = 0;
let restore: { overflow: string; paddingRight: string } | null = null;

function lockScroll(): void {
  if (locks++ > 0) return;
  const root = document.documentElement;
  const gap = window.innerWidth - root.clientWidth;
  restore = { overflow: root.style.overflow, paddingRight: root.style.paddingRight };
  root.style.overflow = 'hidden';
  if (gap > 0) root.style.paddingRight = `${gap}px`;
}

function unlockScroll(): void {
  if (--locks > 0 || !restore) return;
  const root = document.documentElement;
  root.style.overflow = restore.overflow;
  root.style.paddingRight = restore.paddingRight;
  restore = null;
}

export function useScrollLock(active: boolean): void {
  useLayoutEffect(() => {
    if (!active) return;
    lockScroll();
    return unlockScroll;
  }, [active]);
}

// Keep Tab inside `box` (a dialog). Call from a keydown handler; returns true if it handled it.
export function trapTab(e: KeyboardEvent, box: HTMLElement | null): boolean {
  if (e.key !== 'Tab' || !box) return false;
  const items = [
    ...box.querySelectorAll<HTMLElement>('button:not([disabled]), textarea, a[href], input:not([disabled])'),
  ].filter((el) => el.offsetParent !== null || el === document.activeElement);
  if (!items.length) {
    e.preventDefault();
    return true;
  }
  const i = items.indexOf(document.activeElement as HTMLElement);
  if (e.shiftKey && i <= 0) {
    e.preventDefault();
    items[items.length - 1].focus();
    return true;
  }
  if (!e.shiftKey && (i === -1 || i === items.length - 1)) {
    e.preventDefault();
    items[0].focus();
    return true;
  }
  return false;
}
