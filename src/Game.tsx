import { useEffect, useMemo, useRef, useState } from 'react';
import { ADS_ENABLED, APP_TITLE, FAR_THRESHOLD, MAX_TRIES, TOLERANCE } from './admin';
import { track, randomId } from './analytics';
import type { Guess, GameStatus, PropertyConfig, Verdict } from './types';
import { evaluateGuess, percentOff, revealedCount } from './game/logic';
import { buildShareText, copyToClipboard } from './game/share';
import { dayUrl } from './game/dayLink';
import { formatEuro } from './game/format';
import { loadGame, saveGame } from './game/storage';
import { fireConfetti, startRain } from './fx/celebrate';
import { isPC, prefersReducedMotion, useReducedMotion } from './lib/motion';
import { COUNTRY, type CountryCode } from './theme/country';
import { useSeason } from './theme/season';
import { AdSlot } from './components/Ads';
import { CluesPanel } from './components/CluesPanel';
import { GuessForm } from './components/GuessForm';
import { MapView } from './components/MapView';
import { Photo } from './components/Photo';
import { ResultCard } from './components/ResultCard';
import { CopySheet, VerdictSheet } from './components/Sheets';
import { Toast } from './components/Toast';
import { TryCircles, directionWords } from './components/TryCircles';
import { Zoom } from './components/Zoom';

interface GameProps {
  property: PropertyConfig;
  // The country this house is dressed as (confetti colours).
  country: CountryCode;
  // Epoch ms of the next daily reset.
  nextResetMs: number;
  // True when a shared link opened an earlier day's house rather than today's.
  isPastDay: boolean;
  // An app-level overlay (the how-to-play sheet) is open: hold the carousel.
  paused: boolean;
}

// ── Timings of the end-of-game choreography (ms after the guess that ends the game) ─────────
const FORM_LEAVE_MS = 180; // the price field lifts and fades out, then the result card rises
const UNUSED_FADE_MS = 2000; // after a win, the tries that were never needed go quiet
const AUTOPLAY_START_MS = 4000; // the photo carousel starts advancing by itself
const AUTOPLAY_EVERY_MS = 5000; // one photo every 5 seconds
const COPIED_MS = 2500; // how long "Copied!" and the toast stay up
const GUESS_ANIM_MS = 1400; // how long a circle keeps its "just guessed" animation classes

// A saved verdict is only trusted if it is one of the three real votes (older saves may hold
// a legacy "skipped" marker).
function validVerdict(v: unknown): Verdict | null {
  return v === 'steal' || v === 'fair' || v === 'ripoff' ? v : null;
}

// The place shown on the verdict sheet: the config's own `place`, else read from the first
// clue ("Located in Lerici" → "Lerici", "Located near Rome" → "Near Rome"). Empty when the
// first clue isn't a location.
function placeOf(property: PropertyConfig): string {
  if (property.place) return property.place;
  const match = /^Located\s+(?:in\s+)?(.+)$/i.exec(property.facts[0] ?? '');
  if (!match) return '';
  const place = match[1].trim();
  return place.charAt(0).toUpperCase() + place.slice(1);
}

// One house's game: all gameplay state lives here. The rules themselves are the pure helpers in
// src/game/logic.ts; this component decides what is on screen and choreographs the motion.
//
// Two things to know when changing it:
//  • The price never reaches the page before the game is over. It is only handed to the result
//    card, the verdict sheet and the share builder, all of which exist only once `isOver`.
//  • Anything celebratory (confetti, rain, the result card's entrance, the count-up, the
//    shutter cascade) is started by the guess that ends the game, in handleSubmit — never by a
//    render or an effect on `status`. So a finished game restored from storage just appears in
//    its final state, and nothing replays on a reload.
export function Game({ property, country, nextResetMs, isPastDay, paused }: GameProps) {
  const season = useSeason();
  const reducedMotion = useReducedMotion();
  const soldPrice = property.soldPrice;
  const images = property.images;
  // Exactly one clue per try, whatever the config holds.
  const clues = useMemo(
    () => Array.from({ length: MAX_TRIES }, (_, i) => property.facts[i] ?? ''),
    [property.facts],
  );

  // ── Saved progress ─────────────────────────────────────────────────────────────────────
  // Read once, before the first render, so a returning player's game is already in place on
  // first paint (nothing animates into it). <Game> is keyed by slug, so this runs per house.
  const [saved] = useState(() => loadGame(property.slug));
  const [guesses, setGuesses] = useState<Guess[]>(() => saved?.guesses ?? []);
  const [status, setStatus] = useState<GameStatus>(() =>
    saved?.status === 'won' || saved?.status === 'lost' ? saved.status : 'playing',
  );
  // The player's price verdict for this house. Only an actual vote is persisted (with the
  // saved game); skipping the sheet isn't remembered, so it re-appears on every Share until
  // they vote. Only asked when the property opts in via `priceVerdict`.
  const [verdict, setVerdict] = useState<Verdict | null>(() => validVerdict(saved?.verdict));
  // Which try's photo and clue the player is looking at; null = follow the latest revealed one.
  const [selected, setSelected] = useState<number | null>(null);

  const isPlaying = status === 'playing';
  const isOver = !isPlaying; // 'won' or 'lost' — the game has finished
  const [restoredOver] = useState(isOver);

  // ── Live motion state (see the timings above) ──────────────────────────────────────────
  // True once the game has ended in this session, as opposed to being restored finished.
  const [endedLive, setEndedLive] = useState(false);
  const [formLeaving, setFormLeaving] = useState(false);
  const [showResult, setShowResult] = useState(restoredOver);
  const [unusedReady, setUnusedReady] = useState(true);
  const [autoplay, setAutoplay] = useState(restoredOver);
  // The try whose guess just landed (arrow pop, label rise, next circle's bounce).
  const [justGuessed, setJustGuessed] = useState<number | null>(null);
  // Bumped whenever a wrong guess unlocks a new photo and clue.
  const [newClueTick, setNewClueTick] = useState(0);
  // The Clues panel starts collapsed on phones and tablets, and open on a PC, where it sits
  // beside the photo (app.css). Its state is deliberately not saved.
  const [cluesOpen, setCluesOpen] = useState(isPC);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [verdictOpen, setVerdictOpen] = useState(false);
  // The share text, when the browser refused to copy it (opens the copy-fallback sheet).
  const [fallbackText, setFallbackText] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [toastTick, setToastTick] = useState(0);
  // Spoken (never shown) feedback after a wrong guess.
  const [announcement, setAnnouncement] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);
  const photoFrameRef = useRef<HTMLDivElement>(null);

  // Every timer the choreography starts, so they can all be dropped if the game unmounts.
  const timers = useRef<number[]>([]);
  const stopRain = useRef<(() => void) | null>(null);
  const copiedTimer = useRef(0);
  function later(fn: () => void, ms: number) {
    timers.current.push(window.setTimeout(fn, ms));
  }
  useEffect(
    () => () => {
      timers.current.forEach((t) => window.clearTimeout(t));
      window.clearTimeout(copiedTimer.current);
      stopRain.current?.();
    },
    [],
  );

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

  // ── What is on screen ──────────────────────────────────────────────────────────────────
  const wrongCount = guesses.filter((g) => g.direction !== 'correct').length;
  // Photos/clues unlocked: one more per wrong guess while playing, everything once it's over.
  const revealed = isOver ? MAX_TRIES : revealedCount(wrongCount, MAX_TRIES);
  const latestIndex = Math.min(wrongCount, MAX_TRIES - 1);
  const winIndex = guesses.findIndex((g) => g.direction === 'correct');
  // The try being played — or, once over, the try the game ended on.
  const currentIndex = isPlaying ? guesses.length : winIndex >= 0 ? winIndex : MAX_TRIES - 1;
  const viewedIndex = selected ?? latestIndex;
  const photoIndex = Math.max(0, Math.min(viewedIndex, images.length - 1));

  // A guess that hit the price exactly (€0 / 0% off) — "right on the money".
  const isExact = guesses.some((g) => g.value === soldPrice);
  const closestPercentOff = guesses.length
    ? Math.min(...guesses.map((g) => percentOff(g.value, soldPrice)))
    : 0;

  // ── End-game carousel ──────────────────────────────────────────────────────────────────
  // Once the game is over the photo becomes a carousel: it keeps showing the photo the player
  // finished on, then advances one to the right every 5 seconds, wrapping 6 → 1. The interval
  // is rebuilt whenever the photo on screen changes, so any manual navigation (arrows, swipe,
  // try circles, clue tiles) starts a fresh 5-second window instead of stopping the cycle.
  // It holds still while the zoom or a sheet is open, while the tab is hidden, and it never
  // runs for players who asked for reduced motion.
  const overlayOpen = paused || zoomOpen || verdictOpen || fallbackText !== null;
  useEffect(() => {
    if (!autoplay || overlayOpen || reducedMotion) return;
    const id = window.setInterval(() => {
      if (!document.hidden) setSelected((viewedIndex + 1) % MAX_TRIES);
    }, AUTOPLAY_EVERY_MS);
    return () => window.clearInterval(id);
  }, [autoplay, overlayOpen, reducedMotion, viewedIndex]);

  // Fetch what will be needed next before it is asked for: the following photo while playing,
  // the whole set once the carousel can show any of them. The crossfade still waits for the
  // image to decode, so a slow connection only ever delays a fade, never shows half a photo.
  useEffect(() => {
    const ahead = isOver ? images : images.slice(latestIndex + 1, latestIndex + 2);
    ahead.forEach((src) => {
      new Image().src = src;
    });
  }, [isOver, latestIndex, images]);

  // Bring the photo (and the clue pill above it) back on screen if it has scrolled out of
  // view, leaving 8px of air — below the past-day banner when that is pinned to the top.
  function revealPhoto() {
    const frame = photoFrameRef.current;
    if (!frame) return;
    const banner = document.querySelector('.pastday')?.getBoundingClientRect().height ?? 0;
    const top = frame.getBoundingClientRect().top - 28; // the pill sits 28px above the frame
    const limit = banner + 8;
    if (top < limit) {
      window.scrollTo({
        top: window.scrollY + top - limit,
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      });
    }
  }

  // Look at a particular try's photo and clue (a try circle or a clue tile was tapped).
  function selectTry(index: number) {
    setSelected(index);
    revealPhoto();
  }

  // Manual carousel step (±1 from the arrows, a swipe or the arrow keys), wrapping both ways.
  function stepPhoto(delta: number) {
    setSelected((viewedIndex + delta + MAX_TRIES) % MAX_TRIES);
  }

  function handleSubmit(value: number) {
    if (!isPlaying) return;
    const direction = evaluateGuess(value, soldPrice, TOLERANCE, FAR_THRESHOLD);
    const nextGuesses = [...guesses, { value, direction }];

    let nextStatus: GameStatus = 'playing';
    if (direction === 'correct') nextStatus = 'won';
    else if (nextGuesses.length >= MAX_TRIES) nextStatus = 'lost';

    setGuesses(nextGuesses);
    setStatus(nextStatus);
    setSelected(null); // jump back to the latest photo after guessing
    saveGame({ slug: property.slug, guesses: nextGuesses, status: nextStatus });

    // ── Motion ─────────────────────────────────────────────────────────────────────────
    const tryIndex = nextGuesses.length - 1;
    setJustGuessed(tryIndex);
    later(() => setJustGuessed((cur) => (cur === tryIndex ? null : cur)), GUESS_ANIM_MS);

    if (nextStatus === 'playing') {
      setNewClueTick((t) => t + 1);
      setAnnouncement(
        `${formatEuro(value)} is ${directionWords(direction)}. Try ${nextGuesses.length + 1} of ${MAX_TRIES}.`,
      );
      revealPhoto();
    } else {
      setAnnouncement('');
      inputRef.current?.blur(); // closes the mobile keyboard before the card rises
      setEndedLive(true);
      setFormLeaving(true);
      later(() => setShowResult(true), prefersReducedMotion() ? 0 : FORM_LEAVE_MS);
      if (nextStatus === 'won') {
        fireConfetti(value === soldPrice, country, season);
        if (nextGuesses.length < MAX_TRIES) {
          setUnusedReady(false);
          later(() => setUnusedReady(true), UNUSED_FADE_MS);
        }
      } else {
        stopRain.current = startRain(season);
      }
      later(() => setAutoplay(true), AUTOPLAY_START_MS);
    }

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
        verdict: '',
      };
    }
  }

  // ── Sharing ────────────────────────────────────────────────────────────────────────────
  // A share is two steps. `startCopy` runs inside the tap: it marks the Results row shared
  // (with the verdict, if any), flushes it, and writes the text to the clipboard while the
  // browser still sees a user gesture. `finishCopy` shows what happened — "Copied!" plus the
  // toast, or the copy-fallback sheet if the browser refused. On the verdict path the second
  // step waits until the sheet has closed.
  interface CopyJob {
    text: string;
    done: Promise<boolean>;
  }
  const copyJob = useRef<CopyJob | null>(null);

  function startCopy(v: Verdict | null): CopyJob {
    if (pendingResultRef.current) {
      pendingResultRef.current.shared = true;
      if (v) pendingResultRef.current.verdict = v;
    }
    flushResult();
    const text = buildShareText(
      APP_TITLE,
      guesses,
      MAX_TRIES,
      dayUrl(property.slug),
      closestPercentOff,
      property.shareFlag ?? COUNTRY[country].emoji,
      v,
    );
    return { text, done: copyToClipboard(text) };
  }

  function finishCopy(job: CopyJob) {
    void job.done.then((ok) => {
      if (!ok) {
        setFallbackText(job.text);
        return;
      }
      setCopied(true);
      setToastTick((t) => t + 1);
      // Sharing again inside the window restarts it; toasts never stack.
      window.clearTimeout(copiedTimer.current);
      copiedTimer.current = window.setTimeout(() => setCopied(false), COPIED_MS);
    });
  }

  function handleShare() {
    // Un-voted share on a verdict-enabled house: detour through the verdict sheet.
    if (property.priceVerdict && !verdict) {
      setVerdictOpen(true);
      return;
    }
    finishCopy(startCopy(verdict));
  }

  // A vote: remember it forever for this house, share with the verdict line.
  function handleVote(v: Verdict) {
    setVerdict(v);
    saveGame({ slug: property.slug, guesses, status, verdict: v });
    copyJob.current = startCopy(v);
  }

  // Skip, scrim tap, Escape or drag-down: share without a verdict line. Deliberately not
  // persisted — the sheet comes back on every Share until the player votes.
  function handleSkip() {
    copyJob.current = startCopy(null);
    setVerdictOpen(false);
  }

  function handleVerdictClosed() {
    const job = copyJob.current;
    copyJob.current = null;
    if (job) finishCopy(job);
  }

  // ── Result card content ────────────────────────────────────────────────────────────────
  const outcome = status === 'won' ? (isExact ? 'exact' : 'win') : 'loss';
  let summary = '';
  if (isOver) {
    if (outcome === 'exact') {
      summary = `The exact price, on try ${winIndex + 1}. Unreal.`;
    } else if (outcome === 'win') {
      summary = `You were ${percentOff(guesses[winIndex].value, soldPrice)}% off · solved on try ${winIndex + 1}`;
    } else {
      const closest = guesses.reduce((a, b) =>
        Math.abs(b.value - soldPrice) < Math.abs(a.value - soldPrice) ? b : a,
      );
      summary = `Closest guess ${formatEuro(closest.value)} · ${percentOff(closest.value, soldPrice)}% off`;
    }
  }

  return (
    <main className="game">
      <Photo
        images={images}
        index={photoIndex}
        clue={clues[viewedIndex] ?? ''}
        newClueTick={newClueTick}
        isOver={isOver}
        onStep={stepPhoto}
        onZoom={() => setZoomOpen(true)}
        frameRef={photoFrameRef}
      />

      <TryCircles
        guesses={guesses}
        maxTries={MAX_TRIES}
        isOver={isOver}
        viewedIndex={viewedIndex}
        currentIndex={currentIndex}
        unusedReady={unusedReady}
        justGuessed={justGuessed}
        onSelect={selectTry}
      />

      {showResult ? (
        <ResultCard
          outcome={outcome}
          soldPrice={soldPrice}
          summary={summary}
          propertyUrl={property.propertyUrl}
          live={endedLive}
          copied={copied}
          onShare={handleShare}
          // The countdown is about today's puzzle, so it would only muddy a past day's page.
          nextResetMs={isPastDay ? null : nextResetMs}
        />
      ) : (
        <GuessForm
          guesses={guesses}
          maxTries={MAX_TRIES}
          leaving={formLeaving}
          onSubmit={handleSubmit}
          inputRef={inputRef}
        />
      )}

      <CluesPanel
        clues={clues}
        revealed={revealed}
        viewedIndex={viewedIndex}
        isPlaying={isPlaying}
        cascade={endedLive}
        open={cluesOpen}
        onToggle={() => setCluesOpen((o) => !o)}
        onSelect={selectTry}
      />

      <MapView lat={property.coordinates[0]} lng={property.coordinates[1]} zoom={property.mapZoom ?? 12} />

      {ADS_ENABLED && <AdSlot />}

      {/* Screen-reader feedback after a wrong guess, e.g. "€300,000 is far too low. Try 2 of 6." */}
      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>

      <Zoom
        open={zoomOpen}
        onClose={() => setZoomOpen(false)}
        images={images}
        index={photoIndex}
        clue={clues[viewedIndex] ?? ''}
        revealed={revealed}
        onStep={stepPhoto}
        originRef={photoFrameRef}
      />

      {/* Share-time overlays. They only ever open after the game has ended. */}
      {isOver && (
        <VerdictSheet
          open={verdictOpen}
          image={images[0]}
          soldPrice={soldPrice}
          place={placeOf(property)}
          onVote={handleVote}
          onSkip={handleSkip}
          onDone={() => setVerdictOpen(false)}
          onClosed={handleVerdictClosed}
        />
      )}
      <CopySheet text={fallbackText} onClose={() => setFallbackText(null)} />
      <Toast tick={toastTick} message="Result copied — paste it anywhere" />
    </main>
  );
}
