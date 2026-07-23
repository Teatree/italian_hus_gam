import { useEffect, useRef, useState } from 'react';

interface ImageViewerProps {
  src: string;
  index: number; // 1-based, for the corner badge
  total: number;
  // End-game carousel mode: all the property's photos, stacked for a smooth crossfade
  // between them. Only passed once the game is over (every photo is revealed by then).
  carouselImages?: string[];
  // Manual carousel step (+1 / -1), wired to the arrow buttons and swipes.
  onStep?: (delta: number) => void;
  // Reports the zoom lightbox opening/closing, so the carousel auto-advance can pause
  // while the player is looking at a full-screen photo.
  onZoomChange?: (zoomed: boolean) => void;
}

// Chevron used by the carousel's prev/next buttons.
function ChevronIcon({ className, flipped }: { className?: string; flipped?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={flipped ? { transform: 'scaleX(-1)' } : undefined}
      aria-hidden="true"
    >
      <polyline points="9 6 15 12 9 18" />
    </svg>
  );
}

// Magnifying-glass ("looking glass") icon used for the zoom button.
function ZoomIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <line x1="11" y1="8" x2="11" y2="14" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  );
}

// Full-screen photo overlay, shared by the image viewer and the verdict popup. z-[9999]
// keeps it above everything else (including the verdict popup at z-[1100]); a click anywhere
// or Escape closes only the lightbox, revealing whatever was underneath. With `onStep`
// (end-game carousel mode) it also gets prev/next arrows and ←/→ key navigation.
export function Lightbox({
  src,
  alt,
  onClose,
  onStep,
}: {
  src: string;
  alt: string;
  onClose: () => void;
  onStep?: (delta: number) => void;
}) {
  // While open: close on Escape (step on ←/→ when navigable) and lock background scrolling.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') onStep?.(1);
      else if (e.key === 'ArrowLeft') onStep?.(-1);
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose, onStep]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Full screen house photo"
      onClick={onClose}
      className="fixed inset-0 z-[9999] flex cursor-zoom-out items-center justify-center bg-black/90 p-4"
    >
      <img src={src} alt={alt} className="max-h-full max-w-full rounded-lg object-contain shadow-2xl" />

      {/* Same faded prev/next controls as the inline carousel. stopPropagation keeps an
          arrow click from bubbling to the close-on-click backdrop. */}
      {onStep && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onStep(-1);
            }}
            aria-label="Previous photo"
            className="carousel-ui absolute left-4 top-1/2 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/15 text-white/75 transition-colors hover:bg-white/30 hover:text-white"
          >
            <ChevronIcon className="h-6 w-6" flipped />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onStep(1);
            }}
            aria-label="Next photo"
            className="carousel-ui absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/15 text-white/75 transition-colors hover:bg-white/30 hover:text-white"
          >
            <ChevronIcon className="h-6 w-6" />
          </button>
        </>
      )}
    </div>
  );
}

export function ImageViewer({
  src,
  index,
  total,
  carouselImages,
  onStep,
  onZoomChange,
}: ImageViewerProps) {
  const [zoomed, setZoomedState] = useState(false);

  function setZoomed(v: boolean) {
    setZoomedState(v);
    onZoomChange?.(v);
  }
  // Swipe tracking (carousel mode). A horizontal drag steps the carousel; the flag then
  // suppresses the click browsers fire after the touch, so a swipe never opens the zoom.
  const touchStartX = useRef<number | null>(null);
  const swipedRef = useRef(false);

  const carousel = !!carouselImages && carouselImages.length > 1 && !!onStep;

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    swipedRef.current = false;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) > 40) {
      swipedRef.current = true;
      onStep?.(dx < 0 ? 1 : -1); // swipe left → next image, swipe right → previous
    }
  }

  function openZoom() {
    if (swipedRef.current) {
      swipedRef.current = false;
      return;
    }
    setZoomed(true);
  }

  return (
    <>
      <div
        className="relative overflow-hidden rounded-lg bg-panelAlt shadow-lg"
        onTouchStart={carousel ? handleTouchStart : undefined}
        onTouchEnd={carousel ? handleTouchEnd : undefined}
      >
        <button
          type="button"
          onClick={openZoom}
          aria-label="Expand image to full screen"
          className="block w-full cursor-zoom-in"
        >
          {carousel ? (
            // All photos stacked; only the active one is opaque, so switching crossfades
            // smoothly instead of swapping abruptly.
            <div className="relative aspect-[4/3] w-full">
              {carouselImages!.map((imgSrc, i) => (
                <img
                  key={imgSrc}
                  src={imgSrc}
                  alt={i === index - 1 ? `House photo ${index} of ${total}` : ''}
                  className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
                    i === index - 1 ? 'opacity-100' : 'opacity-0'
                  }`}
                />
              ))}
            </div>
          ) : (
            <img
              src={src}
              alt={`House photo ${index} of ${total}`}
              className="aspect-[4/3] w-full object-cover"
            />
          )}
        </button>

        <span className="pointer-events-none absolute right-2 top-2 rounded-md bg-black/60 px-2 py-1 text-xs font-medium text-white">
          {index} / {total}
        </span>

        {/* Faded prev/next controls, shown only in end-game carousel mode. */}
        {carousel && (
          <>
            <button
              type="button"
              onClick={() => onStep!(-1)}
              aria-label="Previous photo"
              className="carousel-ui absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white/75 transition-colors hover:bg-black/65 hover:text-white"
            >
              <ChevronIcon className="h-6 w-6" flipped />
            </button>
            <button
              type="button"
              onClick={() => onStep!(1)}
              aria-label="Next photo"
              className="carousel-ui absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white/75 transition-colors hover:bg-black/65 hover:text-white"
            >
              <ChevronIcon className="h-6 w-6" />
            </button>
          </>
        )}

        {/* Explicit zoom button in the corner */}
        <button
          type="button"
          onClick={() => setZoomed(true)}
          aria-label="Zoom image"
          className="absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-md bg-black/60 text-white transition-colors hover:bg-black/80 cursor-zoom-in"
        >
          <ZoomIcon className="h-5 w-5" />
        </button>
      </div>

      {zoomed && (
        <Lightbox
          src={src}
          alt={`House photo ${index} of ${total}`}
          onClose={() => setZoomed(false)}
          onStep={carousel ? onStep : undefined}
        />
      )}
    </>
  );
}
