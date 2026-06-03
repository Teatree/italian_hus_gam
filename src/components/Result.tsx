import { useState } from 'react';
import type { GameStatus } from '../types';
import { formatEuro } from '../game/format';

interface ResultProps {
  status: Exclude<GameStatus, 'playing'>;
  soldPrice: number;
  percentOff: number; // closest guess's distance from the exact price
  propertyUrl: string;
  onShare: () => Promise<boolean>;
}

export function Result({ status, soldPrice, percentOff, propertyUrl, onShare }: ResultProps) {
  const [copied, setCopied] = useState(false);
  const won = status === 'won';

  async function handleShare() {
    const ok = await onShare();
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    }
  }

  return (
    <div className="space-y-3 text-center">
      <p
        className={`text-3xl font-extrabold ${won ? 'text-green-400' : 'text-red-500'}`}
        data-testid="result-banner"
      >
        {won ? 'Good Job!' : 'You Suck!'}
      </p>
      <p className="text-slate-200">
        This house is being sold for:{' '}
        <span className="font-bold text-white">{formatEuro(soldPrice)}</span>, you were{' '}
        <span className="font-bold text-white">{percentOff}%</span> from the exact price.
      </p>
      <p>
        <a
          href={propertyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sky-400 underline underline-offset-2 hover:text-sky-300"
        >
          link to property
        </a>
      </p>
      <button
        onClick={handleShare}
        className="mx-auto block rounded-md bg-accent px-6 py-2.5 font-semibold text-white transition-colors hover:bg-green-500"
      >
        {copied ? 'Copied' : 'Share'}
      </button>
    </div>
  );
}
