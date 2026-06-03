import { useEffect, useState } from 'react';
import { APP_TITLE, MAX_TRIES, TOLERANCE, activeProperty } from './admin';
import type { Guess, GameStatus } from './types';
import { evaluateGuess, percentOff, revealedCount } from './game/logic';
import { buildShareText, copyToClipboard } from './game/share';
import { loadGame, saveGame } from './game/storage';
import { Header } from './components/Header';
import { ImageViewer } from './components/ImageViewer';
import { FactsList } from './components/FactsList';
import { TriesRow } from './components/TriesRow';
import { GuessInput } from './components/GuessInput';
import { GuessList } from './components/GuessList';
import { MapView } from './components/MapView';
import { Result } from './components/Result';

function imageUrl(slug: string, filename: string): string {
  return `${import.meta.env.BASE_URL}properties/${slug}/${filename}`;
}

export default function App() {
  const property = activeProperty;
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

  const wrongCount = guesses.filter((g) => g.direction !== 'correct').length;
  const revealed = revealedCount(wrongCount, MAX_TRIES); // facts/images shown
  const latestImageIndex = Math.min(wrongCount, property.images.length - 1);
  const displayedImageIndex = selectedImage ?? latestImageIndex;
  const isPlaying = status === 'playing';

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

  const remaining = MAX_TRIES - guesses.length;

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col gap-4 px-4 py-6">
      <Header title={APP_TITLE} />

      <ImageViewer
        src={imageUrl(property.slug, property.images[displayedImageIndex])}
        index={displayedImageIndex + 1}
        total={property.images.length}
      />

      <TriesRow
        guesses={guesses}
        maxTries={MAX_TRIES}
        isPlaying={isPlaying}
        revealedUpTo={latestImageIndex}
        selectedIndex={displayedImageIndex}
        onSelect={(i) => setSelectedImage(i)}
      />

      {isPlaying ? (
        <>
          <FactsList facts={property.facts.slice(0, revealed)} />

          <p className="text-center text-sm text-slate-300">
            {remaining} {remaining === 1 ? 'guess' : 'guesses'} remaining!
          </p>

          <GuessInput onSubmit={handleSubmit} disabled={!isPlaying} />

          <GuessList guesses={guesses} />
        </>
      ) : (
        <Result
          status={status}
          soldPrice={soldPrice}
          percentOff={closestPercentOff}
          onShare={handleShare}
        />
      )}

      <MapView
        lat={property.coordinates.lat}
        lng={property.coordinates.lng}
        zoom={property.mapZoom ?? 12}
      />
    </div>
  );
}
