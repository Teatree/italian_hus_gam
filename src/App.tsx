import { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { APP_TITLE, MAX_TRIES, TOLERANCE, OVERRIDE_SLUG } from './admin';
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

  // When the player wins: a little confetti burst from both sides, then (after a 2s delay)
  // fade the unused try buttons to a slightly lighter blue.
  const [lightenUnused, setLightenUnused] = useState(false);
  useEffect(() => {
    if (status !== 'won') {
      setLightenUnused(false);
      return;
    }
    confetti({ particleCount: 70, angle: 60, spread: 55, startVelocity: 55, origin: { x: 0, y: 0.7 } });
    confetti({ particleCount: 70, angle: 120, spread: 55, startVelocity: 55, origin: { x: 1, y: 0.7 } });
    const id = window.setTimeout(() => setLightenUnused(true), 2000);
    return () => window.clearTimeout(id);
  }, [status]);

  const wrongCount = guesses.filter((g) => g.direction !== 'correct').length;
  const revealed = revealedCount(wrongCount, MAX_TRIES); // facts/images shown
  const latestImageIndex = Math.min(wrongCount, property.images.length - 1);
  const displayedImageIndex = selectedImage ?? latestImageIndex;
  const isPlaying = status === 'playing';
  const won = status === 'won';

  // On win, reveal every hint (one-by-one). The facts panel is shown while playing and on win.
  const showFacts = isPlaying || won;
  const factsToShow = won ? property.facts : property.facts.slice(0, revealed);
  // Once the game is over the player can browse all of the tries' images.
  const triesRevealedUpTo = isPlaying ? latestImageIndex : property.images.length - 1;

  const closestPercentOff = guesses.length
    ? Math.min(...guesses.map((g) => percentOff(g.value, soldPrice)))
    : 0;

  function handleSubmit(value: number) {
    if (!isPlaying) return;
    const direction = evaluateGuess(value, soldPrice, TOLERANCE);
    const nextGuesses = [...guesses, { value, direction }];

    let nextStatus: GameStatus = 'playing';
    if (direction === 'correct') nextStatus = 'won';
    else if (nextGuesses.length >= MAX_TRIES) nextStatus = 'lost';

    setGuesses(nextGuesses);
    setStatus(nextStatus);
    setSelectedImage(null); // jump back to the latest image after guessing
    saveGame({ slug: property.slug, guesses: nextGuesses, status: nextStatus });
  }

  async function handleShare(): Promise<boolean> {
    const text = buildShareText(APP_TITLE, guesses, MAX_TRIES, window.location.href);
    return copyToClipboard(text);
  }

  return (
    <div className="mx-auto flex min-h-full max-w-5xl flex-col gap-4 px-4 pb-6 pt-2">
      <Header title={APP_TITLE} />

      {/* Image stays centered; the hints list sits to its right (stacks below on narrow screens). */}
      <div className="flex flex-col items-center gap-4 lg:flex-row lg:items-start lg:justify-center">
        {showFacts && <div className="hidden lg:block lg:w-56 lg:shrink-0" aria-hidden="true" />}

        <div className="w-full max-w-md lg:shrink-0">
          <ImageViewer
            src={property.images[displayedImageIndex]}
            index={displayedImageIndex + 1}
            total={property.images.length}
          />
        </div>

        {showFacts && (
          <div className="w-full max-w-md lg:w-56 lg:max-w-none lg:shrink-0">
            <FactsList facts={factsToShow} highlightIndex={selectedImage} stagger={won} />
          </div>
        )}
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
