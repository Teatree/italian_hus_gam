import { useEffect, useRef, useState } from 'react';
import videoSrc from '../assets/long_truck.mp4';

interface WinVideoModalProps {
  onClose: () => void;
}

// Celebration video shown once, a few seconds after the winning guess. The player
// matches the clip's 4:3 (384x288) frame; clicking the backdrop also dismisses it.
export function WinVideoModal({ onClose }: WinVideoModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  // The modal opens on a timer, not directly on a click, so strict browsers (Safari)
  // may refuse unmuted autoplay. When that happens we play muted and show this prompt.
  const [needsUnmute, setNeedsUnmute] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = false;
    void v.play().catch(() => {
      v.muted = true;
      setNeedsUnmute(true);
      void v.play().catch(() => {
        // Even muted playback was blocked; the first frame stays and a tap starts it.
      });
    });
  }, []);

  function enableSound() {
    const v = videoRef.current;
    if (!v) return;
    v.muted = false;
    setNeedsUnmute(false);
    void v.play();
  }

  function togglePlayback() {
    const v = videoRef.current;
    if (!v) return;
    if (needsUnmute) {
      enableSound();
    } else if (v.paused) {
      void v.play();
    } else {
      v.pause();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        className="relative aspect-[4/3] w-[min(90vw,480px)] overflow-hidden rounded-xl bg-black shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <video
          ref={videoRef}
          src={videoSrc}
          loop
          playsInline
          // TikTok-style tap to pause/resume (or to enable sound when autoplay was muted).
          onClick={togglePlayback}
          className="h-full w-full object-cover"
        />
        {needsUnmute && (
          <button
            onClick={enableSound}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-black/80"
          >
            🔊 Tap for sound
          </button>
        )}
        <button
          onClick={onClose}
          aria-label="Close video"
          className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-xl font-bold text-white transition-colors hover:bg-black/80"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
