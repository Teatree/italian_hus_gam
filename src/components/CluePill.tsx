import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '../lib/motion';
import { ClueIcon } from './Icons';

interface CluePillProps {
  // The clue that belongs to the photo being viewed (clue n ↔ photo n). Empty → no pill.
  text: string;
  // 0-based clue number and how many clues there are, for the accessible name.
  index: number;
  total: number;
  // Bumped by the game each time a wrong guess unlocks a new clue. A text change that arrives
  // together with a new value replays the pill's entrance and the magnifier's wiggle; any other
  // change (reviewing a try, the carousel) only swaps the text.
  newTick?: number;
  // The copy inside the photo zoom: same pill, anchored to the enlarged photo.
  zoom?: boolean;
}

// The clue pill: a proper UI element sitting above the photo (it overlaps the photo's top edge
// and hangs past its left edge). The pill itself stays put; only its text changes — the old text
// lifts and fades out over 140ms, then the new text fades in.
//
// No aria-live here on purpose: the end-of-game carousel would otherwise announce every
// auto-advance. A new clue is announced through the game's own status line instead.
export function CluePill({ text, index, total, newTick = 0, zoom = false }: CluePillProps) {
  const [shown, setShown] = useState({ text, index });
  const [out, setOut] = useState(false);
  const [fresh, setFresh] = useState(false);
  const seenTick = useRef(newTick);

  useEffect(() => {
    if (text === shown.text && index === shown.index) return;
    const isNew = newTick !== seenTick.current;
    seenTick.current = newTick;

    if (prefersReducedMotion()) {
      setShown({ text, index });
      setOut(false);
      setFresh(false);
      return;
    }
    setOut(true);
    setFresh(false); // so the entrance can replay for the next new clue
    const id = window.setTimeout(() => {
      setShown({ text, index });
      setOut(false);
      if (isNew) setFresh(true);
    }, 140);
    return () => window.clearTimeout(id);
    // `shown` is this effect's own output; depending on it would cancel the swap it just started.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, index, newTick]);

  return (
    <div
      className={`clue-tag${zoom ? ' clue-tag--zoom' : ''}${fresh ? ' is-new' : ''}`}
      role="note"
      aria-label={`Clue ${shown.index + 1} of ${total}: ${shown.text}`}
      hidden={!shown.text.trim()}
    >
      <ClueIcon size={22} />
      <span className={`clue-tag__text${out ? ' is-out' : ''}`}>{shown.text}</span>
    </div>
  );
}
