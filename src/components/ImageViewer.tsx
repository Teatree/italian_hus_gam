import { useEffect, useState } from 'react';

interface ImageViewerProps {
  src: string;
  index: number; // 1-based, for the corner badge
  total: number;
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

export function ImageViewer({ src, index, total }: ImageViewerProps) {
  const [zoomed, setZoomed] = useState(false);

  // While the lightbox is open: close on Escape and lock background scrolling.
  useEffect(() => {
    if (!zoomed) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setZoomed(false);
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [zoomed]);

  return (
    <>
      <div className="relative overflow-hidden rounded-lg bg-panelAlt shadow-lg">
        <button
          type="button"
          onClick={() => setZoomed(true)}
          aria-label="Expand image to full screen"
          className="block w-full cursor-zoom-in"
        >
          <img
            src={src}
            alt={`House photo ${index} of ${total}`}
            className="aspect-[4/3] w-full object-cover"
          />
        </button>

        <span className="pointer-events-none absolute right-2 top-2 rounded-md bg-black/60 px-2 py-1 text-xs font-medium text-white">
          {index} / {total}
        </span>

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
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Full screen house photo"
          onClick={() => setZoomed(false)}
          className="fixed inset-0 z-[9999] flex cursor-zoom-out items-center justify-center bg-black/90 p-4"
        >
          <img
            src={src}
            alt={`House photo ${index} of ${total}`}
            className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
          />
        </div>
      )}
    </>
  );
}
