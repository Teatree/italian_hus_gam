import { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  APP_TITLE,
  MAX_TRIES,
  TOLERANCE,
  TOLERANCE_CAP,
  FAR_THRESHOLD,
  FAR_THRESHOLD_CAP,
  OVERRIDE_SLUG,
} from './admin';
import { track, loadGeo, randomId, isMobile } from './analytics';
import { properties } from './properties';
import type { Guess, GameStatus, PropertyConfig } from './types';
import { evaluateGuess, percentOff, revealedCount } from './game/logic';
import { getScheduleInfo } from './game/schedule';
import { buildShareText, copyToClipboard } from './game/share';
import { loadGame, saveGame } from './game/storage';
import { Header } from './components/Header';
import { ImageViewer } from './components/ImageViewer';
import { FactsList } from './components/FactsList';
import { TriesRow } from './components/TriesRow';
import { GuessInput } from './components/GuessInput';
import { GuessList } from './components/GuessList';
import { NewGameTimer } from './components/NewGameTimer';
import { MapView } from './components/MapView';
import { Result } from './components/Result';

// Resolves which property is active today and auto-refreshes the page at the daily reset.
export default function App() {
  // Resolve the schedule once on mount; the page reloads at the reset boundary anyway.
  const [{ dateKey, nextResetMs }] = useState(() => getScheduleInfo());

  // When the daily reset passes while a player is here, reload so the new puzzle loads
  // fresh (and we never run the previous day's game state against a new property).
  useEffect(() => {
    const id = window.setInterval(() => {
      if (Date.now() >= nextResetMs) window.location.reload();
    }, 1000);
    return () => window.clearInterval(id);
  }, [nextResetMs]);

  const slug = OVERRIDE_SLUG ?? dateKey;
  const property = properties[slug] ?? null;

  // One Sessions row per page load: who showed up, from where, on what. Fires after the geo
  // lookup so ip/country/city are populated. Runs even on the come-back screen (still a visit).
  useEffect(() => {
    const seenKey = 'gth:analytics:seen';
    const isReturning = localStorage.getItem(seenKey) === '1';
    try {
      localStorage.setItem(seenKey, '1');
    } catch {
      // ignore storage failures (private mode, etc.)
    }
    void loadGeo().then((g) => {
      track('Sessions', {
        puzzleDate: slug,
        city: g.city,
        isReturning,
        referrer: document.referrer,
        userAgent: navigator.userAgent,
        device: isMobile() ? 'mobile' : 'desktop',
        language: navigator.language,
        screenW: window.innerWidth,
      });
    });
    // Only once per mount (one page load = one session).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!property) {
    return <ComeBackScreen targetMs={nextResetMs} />;
  }

  // `key` ensures a clean remount (fresh game state) if the active property changes.
  return <Game key={property.slug} property={property} nextResetMs={nextResetMs} />;
}

// Shown when no property is scheduled for the current day.
function ComeBackScreen({ targetMs }: { targetMs: number }) {
  return (
    <div className="mx-auto flex min-h-full max-w-5xl flex-col gap-6 px-4 pb-6 pt-2">
      <Header title={APP_TITLE} />
      <div className="mx-auto max-w-md space-y-4 pt-10 text-center">
        <p className="text-xl font-semibold text-white">No puzzle today — check back soon!</p>
        <NewGameTimer targetMs={targetMs} />
      </div>
    </div>
  );
}

interface GameProps {
  property: PropertyConfig;
  nextResetMs: number;
}

function Game({ property, nextResetMs }: GameProps) {
  const soldPrice = property.soldPrice;

  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [status, setStatus] = useState<GameStatus>('playing');
  // Which try's image the player is viewing; null = follow the latest revealed image.
  const [selectedImage, setSelectedImage] = useState<number | null>(null);

  // ── Analytics state (per attempt) ──────────────────────────────────────────────────────
  // One id per puzzle attempt; pairs the Guesses rows with their Results row. Because <Game>
  // is keyed by slug it remounts per puzzle, so this re-inits naturally each new puzzle.
  const [gameId] = useState(() => randomId('g_'));
  const gameStartRef = useRef<number>(Date.now()); // for totalTimeMs
  const lastGuessRef = useRef<number>(Date.now()); // for per-try timeOnTryMs
  // The finished-game row is held here and flushed once — on share, page-hide, or unmount —
  // so we can record whether the player shared without emitting two rows per game.
  const pendingResultRef = useRef<Record<string, unknown> | null>(null);
  const resultSentRef = useRef(false);

  function flushResult() {
    if (resultSentRef.current || !pendingResultRef.current) return;
    resultSentRef.current = true;
    track('Results', pendingResultRef.current);
  }

  // Flush the pending Results row when the player leaves (covers close, reload, navigate) or
  // when this game unmounts (e.g. the puzzle rolls over). keepalive on the POST lets it land.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') flushResult();
    };
    window.addEventListener('pagehide', flushResult);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('pagehide', flushResult);
      document.removeEventListener('visibilitychange', onHide);
      flushResult();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Restore saved progress for the active house on mount (keyed per slug).
  useEffect(() => {
    const saved = loadGame(property.slug);
    if (saved) {
      setGuesses(saved.guesses);
      setStatus(saved.status);
    } else {
      setGuesses([]);
      setStatus('playing');
    }
    setSelectedImage(null);
  }, [property.slug]);

  // A guess that hit the price exactly (€0 / 0% off) — "right on the money".
  const isExact = guesses.some((g) => g.value === soldPrice);

  // When the player wins: a little confetti burst from both sides, then (after a 2s delay)
  // fade the unused try buttons to a slightly lighter blue. An exact guess gets an extra
  // celebratory burst from the center.
  const [lightenUnused, setLightenUnused] = useState(false);
  useEffect(() => {
    if (status !== 'won') {
      setLightenUnused(false);
      return;
    }
    confetti({ particleCount: 70, angle: 60, spread: 55, startVelocity: 55, origin: { x: 0, y: 0.7 } });
    confetti({ particleCount: 70, angle: 120, spread: 55, startVelocity: 55, origin: { x: 1, y: 0.7 } });
    if (isExact) {
      confetti({ particleCount: 180, spread: 120, startVelocity: 45, origin: { x: 0.5, y: 0.6 }, scalar: 1.1 });
    }
    const id = window.setTimeout(() => setLightenUnused(true), 2000);
    return () => window.clearTimeout(id);
  }, [status, isExact]);

  // When the player loses: a short rain of 👎 emoji that falls from the top under gravity.
  useEffect(() => {
    if (status !== 'lost') return;
    const thumb = confetti.shapeFromText({ text: '👎', scalar: 2 });
    let frame = 0;
    const id = window.setInterval(() => {
      // Spawn a few each tick at random x just above the viewport, with no upward velocity, so
      // gravity carries them straight down like falling rain.
      confetti({
        particleCount: 4,
        startVelocity: 0,
        ticks: 220,
        gravity: 0.7,
        spread: 70,
        origin: { x: Math.random(), y: -0.1 },
        shapes: [thumb],
        scalar: 2,
        flat: true,
        disableForReducedMotion: true,
      });
      frame += 1;
      if (frame >= 12) window.clearInterval(id);
    }, 150);
    return () => window.clearInterval(id);
  }, [status]);

  const wrongCount = guesses.filter((g) => g.direction !== 'correct').length;
  const revealed = revealedCount(wrongCount, MAX_TRIES); // facts/images shown
  const latestImageIndex = Math.min(wrongCount, property.images.length - 1);
  const displayedImageIndex = selectedImage ?? latestImageIndex;
  const isPlaying = status === 'playing';
  const isOver = !isPlaying; // 'won' or 'lost' — the game has finished

  // Facts stay visible the whole game: revealed one-per-wrong-guess while playing, then every
  // hint (revealed one-by-one) once it's over — the same on a loss as on a win.
  const factsToShow = isOver ? property.facts : property.facts.slice(0, revealed);
  // Once the game is over the player can browse all of the tries' images.
  const triesRevealedUpTo = isPlaying ? latestImageIndex : property.images.length - 1;

  const closestPercentOff = guesses.length
    ? Math.min(...guesses.map((g) => percentOff(g.value, soldPrice)))
    : 0;

  function handleSubmit(value: number) {
    if (!isPlaying) return;
    const direction = evaluateGuess(
      value,
      soldPrice,
      TOLERANCE,
      TOLERANCE_CAP,
      FAR_THRESHOLD,
      FAR_THRESHOLD_CAP,
    );
    const nextGuesses = [...guesses, { value, direction }];

    let nextStatus: GameStatus = 'playing';
    if (direction === 'correct') nextStatus = 'won';
    else if (nextGuesses.length >= MAX_TRIES) nextStatus = 'lost';

    setGuesses(nextGuesses);
    setStatus(nextStatus);
    setSelectedImage(null); // jump back to the latest image after guessing
    saveGame({ slug: property.slug, guesses: nextGuesses, status: nextStatus });

    // ── Analytics ──────────────────────────────────────────────────────────────────────
    const now = Date.now();
    const timeOnTryMs = now - lastGuessRef.current;
    lastGuessRef.current = now;

    track('Guesses', {
      gameId,
      puzzleDate: property.slug,
      tryNumber: nextGuesses.length,
      guessValue: value,
      direction,
      percentOff: percentOff(value, soldPrice),
      euroOff: Math.abs(value - soldPrice),
      timeOnTryMs,
      soldPrice,
      // 'playing' = still in the game after this guess; 'won'/'lost' = this guess ended it.
      win_status: nextStatus,
    });

    if (nextStatus !== 'playing') {
      pendingResultRef.current = {
        gameId,
        puzzleDate: property.slug,
        outcome: nextStatus,
        triesUsed: nextGuesses.length,
        exact: nextGuesses.some((g) => g.value === soldPrice),
        closestPercentOff: Math.min(...nextGuesses.map((g) => percentOff(g.value, soldPrice))),
        closestEuroOff: Math.min(...nextGuesses.map((g) => Math.abs(g.value - soldPrice))),
        totalTimeMs: now - gameStartRef.current,
        shared: false,
      };
    }
  }

  async function handleShare(): Promise<boolean> {
    // Record the share on this game's Results row, then flush it (once).
    if (pendingResultRef.current) pendingResultRef.current.shared = true;
    flushResult();
    const text = buildShareText(
      APP_TITLE,
      guesses,
      MAX_TRIES,
      window.location.href,
      closestPercentOff,
    );
    return copyToClipboard(text);
  }

  return (
    <div className="mx-auto flex min-h-full max-w-5xl flex-col gap-4 px-4 pb-6 pt-2">
      <Header title={APP_TITLE} />

      {/* Image stays centered; the hints list sits to its right (stacks below on narrow screens). */}
      <div className="flex flex-col items-center gap-4 lg:flex-row lg:items-start lg:justify-center">
        <div className="hidden lg:block lg:w-56 lg:shrink-0" aria-hidden="true" />

        <div className="w-full max-w-md lg:shrink-0">
          <ImageViewer
            src={property.images[displayedImageIndex]}
            index={displayedImageIndex + 1}
            total={property.images.length}
          />
        </div>

        <div className="w-full max-w-md lg:w-56 lg:max-w-none lg:shrink-0">
          <FactsList facts={factsToShow} highlightIndex={selectedImage} stagger={isOver} />
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-md flex-col gap-4">
        <TriesRow
          guesses={guesses}
          maxTries={MAX_TRIES}
          isPlaying={isPlaying}
          revealedUpTo={triesRevealedUpTo}
          selectedIndex={displayedImageIndex}
          lightenUnused={lightenUnused}
          onSelect={(i) => setSelectedImage(i)}
        />

        <NewGameTimer targetMs={nextResetMs} />

        {isPlaying ? (
          <>
            <GuessInput onSubmit={handleSubmit} disabled={!isPlaying} />

            <GuessList guesses={guesses} />
          </>
        ) : (
          <Result
            status={status}
            soldPrice={soldPrice}
            percentOff={closestPercentOff}
            exact={isExact}
            propertyUrl={property.propertyUrl}
            onShare={handleShare}
          />
        )}

        <MapView
          lat={property.coordinates[0]}
          lng={property.coordinates[1]}
          zoom={property.mapZoom ?? 12}
        />
      </div>
    </div>
  );
}
