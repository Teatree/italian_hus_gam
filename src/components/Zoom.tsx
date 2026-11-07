import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { currentOpener, prefersReducedMotion, retrigger, trapTab, useScrollLock } from '../lib/motion';
import { CluePill } from './CluePill';
import { ChevronIcon, CloseIcon, HouseIcon, LockIcon } from './Icons';

interface ZoomProps {
  open: boolean;
  onClose: () => void;
  images: string[];
  // The photo on screen (0-based) and its clue — the same selection the page shows.
  index: number;
  clue: string;
  // How many photos are unlocked (lights the dots, and limits where the arrows can go).
  revealed: number;
  onStep: (delta: number) => void;
  // The photo frame on the page: the zoom grows out of it and shrinks back into it.
  originRef: RefObject<HTMLElement>;
}

type Phase = 'closed' | 'entering' | 'open' | 'closing';

const FLIP_MS = 320;
const SWIPE_PX = 50;
// "Not clipped", written as an inset() so it can animate to and from the frame's clip.
const UNCLIPPED = 'inset(0px 0px 0px 0px round 0px)';

// The full-screen photo. Opening is a FLIP: the enlarged image starts exactly over the photo
// on the page and animates to its place while the backdrop fades to near-black; closing runs
// it backwards. It is a modal dialog: focus goes to the close button and stays inside, Escape
// closes it, the page behind can't scroll, and focus returns to whatever opened it.
//
// The arrows, a sideways swipe and ←/→ move between photos. While some photos are still locked
// the player can only move among the unlocked ones: asking for a locked one is refused — the
// photo jiggles and a "locked" note flashes. Once every photo is unlocked (the game is over, or
// five wrong guesses in) it is a plain carousel that wraps round, and nothing is ever refused.
export function Zoom({ open, onClose, images, index, clue, revealed, onStep, originRef }: ZoomProps) {
  const total = images.length;
  const [phase, setPhase] = useState<Phase>('closed');
  const [failed, setFailed] = useState(false);
  // The last refused step: `tick` keys the note so it replays, `delta` says which way was asked.
  const [refused, setRefused] = useState({ tick: 0, delta: 1 });
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const request = useRef(0);
  const lastIndex = useRef(index);

  const allUnlocked = revealed >= total;
  const lockedAt = (delta: number) => {
    const target = index + delta;
    return !allUnlocked && (target < 0 || target >= revealed);
  };
  function step(delta: number) {
    if (!lockedAt(delta)) return onStep(delta);
    const img = imgRef.current;
    if (img) {
      img.style.setProperty('--dir', delta > 0 ? '-1' : '1');
      retrigger(img, 'is-refuse');
    }
    setRefused((r) => ({ tick: r.tick + 1, delta }));
  }
  const live = useRef({ onClose, step });
  live.current = { onClose, step };

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

  // Where the on-page photo is, expressed as a transform (origin 0 0) and a clip of the zoom
  // image, so the enlarged photo starts exactly over the one on the page — for any photo shape.
  // The page crops the photo to its 4:3 frame (cover) while the zoom shows all of it (contain),
  // so a plain move-and-scale only lines up for 4:3 photos. Instead the image is scaled until
  // its picture matches the page's cropped picture, and clipped to the frame's rounded rect;
  // both then animate away together.
  function flipFrom(): { transform: string; clip: string } | null {
    const frame = originRef.current;
    const stage = stageRef.current;
    if (!frame || !stage) return null;
    const f = frame.getBoundingClientRect();
    const s = stage.getBoundingClientRect();
    if (!s.width || !s.height || !f.width || !f.height) return null;
    // The photo's real shape, from the page's own copy (already loaded). Unknown → assume 4:3.
    const pageImg = frame.querySelector<HTMLImageElement>('.photo__img.is-front');
    const nw = pageImg?.naturalWidth || 4;
    const nh = pageImg?.naturalHeight || 3;

    // The picture as the zoom draws it: contained in the stage.
    const contain = Math.min(s.width / nw, s.height / nh);
    const boxX = (s.width - nw * contain) / 2;
    const boxY = (s.height - nh * contain) / 2;
    // The picture as the page draws it: covering the frame, overflowing it on one axis.
    const cover = Math.max(f.width / nw, f.height / nh);
    const coverX = f.left + (f.width - nw * cover) / 2;
    const coverY = f.top + (f.height - nh * cover) / 2;

    const scale = cover / contain;
    const tx = coverX - s.left - boxX * scale;
    const ty = coverY - s.top - boxY * scale;
    // The frame's rect, in the image element's own (untransformed) coordinates.
    const left = (f.left - s.left - tx) / scale;
    const top = (f.top - s.top - ty) / scale;
    const right = s.width - left - f.width / scale;
    const bottom = s.height - top - f.height / scale;
    const radius = (parseFloat(getComputedStyle(frame).borderTopLeftRadius) || 0) / scale;
    return {
      transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
      clip: `inset(${top}px ${right}px ${bottom}px ${left}px round ${radius}px)`,
    };
  }

  // The contained image usually doesn't fill the 4:3 stage (portrait or panorama photos).
  // Publish where its rendered box starts so the clue pill hangs off the photo, not the stage.
  function measure() {
    const img = imgRef.current;
    const stage = stageRef.current;
    if (!img || !stage || !img.naturalWidth || !img.naturalHeight) return;
    const scale = Math.min(stage.clientWidth / img.naturalWidth, stage.clientHeight / img.naturalHeight);
    stage.style.setProperty('--box-left', `${(stage.clientWidth - img.naturalWidth * scale) / 2}px`);
    stage.style.setProperty('--box-top', `${(stage.clientHeight - img.naturalHeight * scale) / 2}px`);
  }

  // Before the first paint of the opened zoom: load the photo and park the image over the
  // page photo, so the animation starts from there.
  useLayoutEffect(() => {
    if (phase !== 'entering') return;
    const img = imgRef.current;
    if (!img) return;
    img.classList.remove('is-broken');
    img.dataset.src = images[index];
    img.src = images[index];
    lastIndex.current = index;
    setFailed(false);
    setRefused({ tick: 0, delta: 1 });
    const start = prefersReducedMotion() ? null : flipFrom();
    if (start) {
      img.style.transform = start.transform;
      img.style.clipPath = start.clip;
    }

    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => {
        if (start) {
          img.classList.add('is-flip');
          img.style.transform = '';
          img.style.clipPath = UNCLIPPED;
        }
        setPhase('open');
      });
    });
    closeRef.current?.focus({ preventScroll: true });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
    // Runs once per opening.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Closing: shrink back into the page photo while everything else fades, then unmount.
  useEffect(() => {
    if (phase === 'open') {
      const id = window.setTimeout(() => {
        imgRef.current?.classList.remove('is-flip');
        imgRef.current?.style.removeProperty('clip-path');
      }, FLIP_MS + 40);
      return () => window.clearTimeout(id);
    }
    if (phase !== 'closing') return;
    const reduced = prefersReducedMotion();
    const img = imgRef.current;
    const back = reduced ? null : flipFrom();
    if (img && back) {
      img.classList.remove('is-swipe-out', 'is-swipe-pre', 'is-swipe-in', 'is-refuse');
      img.style.clipPath = UNCLIPPED; // a like-for-like start value, so the clip can animate
      void img.offsetWidth;
      img.classList.add('is-flip');
      img.style.transform = back.transform;
      img.style.clipPath = back.clip;
    }
    const id = window.setTimeout(() => setPhase('closed'), reduced ? 200 : FLIP_MS);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Gone: hand the focus back.
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
  }, [phase]);

  // Stepping to another photo while zoomed: the current one fades and slides
  // out, the source swaps, and the new one fades in from the other side.
  useEffect(() => {
    if (phase !== 'open') return;
    const img = imgRef.current;
    if (!img) return;
    const src = images[index];
    if (img.dataset.src === src) return;

    const forward = (index - lastIndex.current + total) % total === 1;
    lastIndex.current = index;
    const id = ++request.current;
    const load = () => {
      img.classList.remove('is-broken');
      img.dataset.src = src;
      img.src = src;
      setFailed(false);
    };
    if (prefersReducedMotion()) {
      load();
      return;
    }

    img.style.setProperty('--dir', forward ? '-1' : '1');
    img.classList.remove('is-swipe-pre', 'is-swipe-in', 'is-flip', 'is-refuse');
    img.classList.add('is-swipe-out');
    const timers: number[] = [];
    timers.push(
      window.setTimeout(() => {
        if (id !== request.current) return;
        load();
        const enter = () => {
          if (id !== request.current) return;
          img.classList.remove('is-swipe-out');
          img.classList.add('is-swipe-pre');
          void img.offsetWidth;
          img.classList.add('is-swipe-in');
          img.classList.remove('is-swipe-pre');
          timers.push(window.setTimeout(() => img.classList.remove('is-swipe-in'), 240));
        };
        (typeof img.decode === 'function' ? img.decode() : Promise.resolve()).then(enter, enter);
      }, 200),
    );
    return () => timers.forEach((t) => window.clearTimeout(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, phase]);

  const mounted = phase !== 'closed';
  useScrollLock(mounted);

  // Escape closes; ←/→ step photos; Tab stays inside the dialog.
  useEffect(() => {
    if (!mounted) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') live.current.onClose();
      else if (e.key === 'ArrowRight') live.current.step(1);
      else if (e.key === 'ArrowLeft') live.current.step(-1);
      else trapTab(e, rootRef.current);
    };
    const onResize = () => measure();
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
    };
  }, [mounted]);

  // Swipe: more than SWIPE_PX sideways steps to the next / previous photo.
  const swipeStart = useRef<number | null>(null);

  if (!mounted) return null;
  const shown = phase === 'open';

  return createPortal(
    <div
      ref={rootRef}
      className={`zoom${shown ? ' is-shown' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={`Photo ${index + 1} of ${total}`}
    >
      <div className="zoom__bg" onClick={onClose} />
      <button ref={closeRef} className="zoom__close" type="button" onClick={onClose} aria-label="Close photo">
        <CloseIcon />
      </button>
      <div
        ref={stageRef}
        className="zoom__stage"
        onPointerDown={(e) => {
          swipeStart.current = e.clientX;
        }}
        onPointerUp={(e) => {
          if (swipeStart.current === null) return;
          const dx = e.clientX - swipeStart.current;
          swipeStart.current = null;
          if (Math.abs(dx) > SWIPE_PX) step(dx < 0 ? 1 : -1);
        }}
        onPointerCancel={() => {
          swipeStart.current = null;
        }}
      >
        <img
          ref={imgRef}
          // Its classes are driven through the ref (FLIP, swipe, broken), never by a render.
          className="zoom__img"
          alt={`Listing photo ${index + 1} of ${total}`}
          draggable={false}
          onLoad={measure}
          onAnimationEnd={(e) => e.currentTarget.classList.remove('is-refuse')}
          onError={(e) => {
            e.currentTarget.classList.add('is-broken');
            setFailed(true);
          }}
        />
        {failed && (
          <div className="photo__fallback" style={{ cursor: 'default' }}>
            <HouseIcon size={48} />
          </div>
        )}
        <CluePill text={clue} index={index} total={total} zoom />
        {total > 1 && (
          <>
            <button
              className={`photo-btn photo__nav photo__nav--prev${lockedAt(-1) ? ' is-end' : ''}`}
              type="button"
              onClick={() => step(-1)}
              aria-label={lockedAt(-1) ? 'Previous photo (this is the first one)' : 'Previous photo'}
            >
              <ChevronIcon dir="left" size={26} />
            </button>
            <button
              className={`photo-btn photo__nav photo__nav--next${lockedAt(1) ? ' is-locked' : ''}`}
              type="button"
              onClick={() => step(1)}
              aria-label={lockedAt(1) ? 'Next photo (locked)' : 'Next photo'}
            >
              {lockedAt(1) ? <LockIcon size={20} /> : <ChevronIcon dir="right" size={26} />}
            </button>
          </>
        )}
        {refused.tick > 0 && (
          <p key={refused.tick} className="zoom__locked" role="status">
            {refused.delta > 0 ? (
              <>
                <LockIcon size={16} />
                Locked — a wrong guess unlocks it
              </>
            ) : (
              'This is the first photo'
            )}
          </p>
        )}
      </div>
      <div className="zoom__foot">
        <div className="zoom__dots" aria-hidden="true">
          {images.map((_, i) => (
            <span
              key={i}
              className={`zoom__dot${i < revealed ? ' is-on' : ''}${i === index ? ' is-sel' : ''}`}
            />
          ))}
        </div>
        <p className="zoom__cap">
          Photo {index + 1} of {total}
          {allUnlocked ? ' · swipe or use the arrows' : ' · more unlock with each miss'}
        </p>
      </div>
    </div>,
    document.body,
  );
}
