import { useEffect, useRef, useState, type RefObject } from 'react';
import { prefersReducedMotion } from '../lib/motion';
import { useSeason } from '../theme/season';
import { CluePill } from './CluePill';
import { ChevronIcon, ExpandIcon, HouseIcon } from './Icons';

interface PhotoProps {
  images: string[];
  // Which photo is on screen (0-based) and the clue that belongs to it.
  index: number;
  clue: string;
  // Bumped when a wrong guess unlocks a new photo + clue (replays the pill's entrance).
  newClueTick: number;
  // The game has ended: the photo becomes a carousel (arrows, swipe, slower crossfade).
  isOver: boolean;
  // While the player is reviewing an earlier try during play: the try number to go back to.
  backToTry: number | null;
  onBack: () => void;
  onStep: (delta: number) => void;
  onZoom: () => void;
  // The 4:3 frame, exposed so the zoom can animate out of it and the page can scroll to it.
  frameRef: RefObject<HTMLDivElement>;
}

// Resolves once `img` can be painted in one go, so a crossfade never shows a half-loaded
// photo. Rejects if the photo fails to load (the caller then shows the fallback).
function ready(img: HTMLImageElement): Promise<void> {
  if (typeof img.decode === 'function') return img.decode();
  return new Promise((resolve, reject) => {
    if (img.complete) return img.naturalWidth > 0 ? resolve() : reject();
    img.addEventListener('load', () => resolve(), { once: true });
    img.addEventListener('error', () => reject(), { once: true });
  });
}

// The photo: an unclipped <figure> holding the 4:3 frame and, above it, the clue pill.
//
// The frame stacks two <img>. Changing photo loads the incoming one into the back layer, waits
// for it to decode, then fades it in over the outgoing one (400ms during play, 700ms in the
// end-of-game carousel) while its scale settles from 1.02 to 1. The two layers are driven
// directly through refs: React never re-renders their src or class, so a new request can take
// over from wherever the running fade happens to be.
export function Photo({
  images,
  index,
  clue,
  newClueTick,
  isOver,
  backToTry,
  onBack,
  onStep,
  onZoom,
  frameRef,
}: PhotoProps) {
  const season = useSeason();
  const total = images.length;
  const layerA = useRef<HTMLImageElement>(null);
  const layerB = useRef<HTMLImageElement>(null);
  const frontIsA = useRef(true);
  const request = useRef(0);
  const [first] = useState(() => ({ src: images[index], alt: altFor(index, total) }));
  // The photo on screen failed to load: show the house outline instead.
  const [failed, setFailed] = useState(false);

  // Season flicker (the Halloween candle): armed when a new photo is revealed during play, and
  // played on the incoming layer as the crossfade starts. Declared before the crossfade effect
  // so it is armed first within the same commit.
  const flickerArmed = useRef(false);
  const seenTick = useRef(newClueTick);
  useEffect(() => {
    if (newClueTick === seenTick.current) return;
    seenTick.current = newClueTick;
    flickerArmed.current = !!season?.photoFlicker;
  }, [newClueTick, season]);

  useEffect(() => {
    const src = images[index];
    const alt = altFor(index, total);
    const front = frontIsA.current ? layerA.current : layerB.current;
    const back = frontIsA.current ? layerB.current : layerA.current;
    if (!front || !back) return;
    if (front.dataset.src === src) {
      front.alt = alt;
      return;
    }

    const id = ++request.current;
    const reduced = prefersReducedMotion();
    const fade = `${reduced ? 1 : isOver ? 700 : 400}ms`;
    front.style.setProperty('--fade', fade);
    back.style.setProperty('--fade', fade);
    back.classList.remove('is-entering', 'is-broken');
    back.dataset.src = src;
    back.src = src;

    const swap = (ok: boolean) => {
      if (id !== request.current) return; // a newer photo was asked for meanwhile
      back.classList.toggle('is-broken', !ok);
      back.classList.add('is-entering');
      void back.offsetWidth;
      back.classList.add('is-front');
      back.removeAttribute('aria-hidden');
      back.alt = alt;
      front.classList.remove('is-front', 'is-entering');
      front.setAttribute('aria-hidden', 'true');
      front.alt = '';
      frontIsA.current = !frontIsA.current;
      setFailed(!ok);
      if (flickerArmed.current && season?.photoFlicker && !reduced) {
        back.animate(season.photoFlicker.frames, {
          duration: season.photoFlicker.duration,
          easing: 'steps(1, end)',
        });
      }
      flickerArmed.current = false;
    };
    ready(back).then(
      () => swap(true),
      () => swap(false),
    );
  }, [images, index, total, isOver, season]);

  // The very first photo isn't crossfaded in, so catch its load failure here.
  function handleError(e: React.SyntheticEvent<HTMLImageElement>) {
    const img = e.currentTarget;
    const front = frontIsA.current ? layerA.current : layerB.current;
    if (img !== front) return;
    img.classList.add('is-broken');
    setFailed(true);
  }

  // Swipe (carousel only). A horizontal drag steps the carousel; the flag then swallows the
  // click the browser fires after the touch, so a swipe never opens the zoom.
  const touchStartX = useRef<number | null>(null);
  const swiped = useRef(false);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    swiped.current = false;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) > 40) {
      swiped.current = true;
      onStep(dx < 0 ? 1 : -1); // swipe left → next photo, swipe right → previous
    }
  }

  function openZoom() {
    if (swiped.current) {
      swiped.current = false;
      return;
    }
    onZoom();
  }

  const reviewing = backToTry !== null;
  // Keep showing the last try number while the chip fades out.
  const backLabel = useRef(backToTry);
  if (backToTry !== null) backLabel.current = backToTry;

  return (
    <figure className={`photo${isOver ? ' is-over' : ''}`}>
      <div
        className="photo__frame"
        ref={frameRef}
        onTouchStart={isOver ? handleTouchStart : undefined}
        onTouchEnd={isOver ? handleTouchEnd : undefined}
      >
        <img
          ref={layerA}
          className="photo__img is-front"
          src={first.src}
          data-src={first.src}
          alt={first.alt}
          draggable={false}
          onClick={openZoom}
          onError={handleError}
        />
        <img
          ref={layerB}
          className="photo__img"
          alt=""
          aria-hidden="true"
          draggable={false}
          onClick={openZoom}
          onError={handleError}
        />
        {failed && (
          <div className="photo__fallback" onClick={openZoom}>
            <HouseIcon />
          </div>
        )}
        {season?.PhotoDecor && <season.PhotoDecor />}

        <button
          className="photo-btn photo__nav photo__nav--prev"
          type="button"
          onClick={() => onStep(-1)}
          aria-label="Previous photo"
          disabled={!isOver}
          aria-hidden={!isOver}
        >
          <ChevronIcon dir="left" />
        </button>
        <button
          className="photo-btn photo__nav photo__nav--next"
          type="button"
          onClick={() => onStep(1)}
          aria-label="Next photo"
          disabled={!isOver}
          aria-hidden={!isOver}
        >
          <ChevronIcon dir="right" />
        </button>
        <button
          className={`back-chip${reviewing ? ' is-shown' : ''}`}
          type="button"
          onClick={onBack}
          tabIndex={reviewing ? 0 : -1}
          aria-hidden={!reviewing}
        >
          Back to try {backLabel.current ?? 1} →
        </button>
        <button
          className="photo-btn photo__zoom"
          type="button"
          onClick={onZoom}
          aria-label="Enlarge photo"
          aria-haspopup="dialog"
        >
          <ExpandIcon />
        </button>
      </div>

      <CluePill text={clue} index={index} total={total} newTick={newClueTick} />
    </figure>
  );
}

function altFor(index: number, total: number): string {
  return `Listing photo ${index + 1} of ${total}`;
}
