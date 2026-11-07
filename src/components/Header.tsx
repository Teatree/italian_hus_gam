import type { ReactNode } from 'react';
import { APP_TITLE } from '../admin';
import { COUNTRY, type CountryCode } from '../theme/country';
import type { ThemeMode } from '../theme/theme';
import { MoonIcon, SunIcon } from './Icons';

// The striped café awning across the top of the page: two pure-CSS layers (stripes, then the
// scalloped edge) that repeat at any width and recolour with the country and the theme.
export function Awning() {
  return (
    <div className="awning" aria-hidden="true">
      <div className="awning__stripes" />
      <div className="awning__scallops" />
    </div>
  );
}

interface HeaderProps {
  country: CountryCode;
  // The house's position on the schedule ("Nº 147"); null when it has none.
  houseNumber: number | null;
  // Where the flag chip links to (the "bonus link"); empty → the chip is plain text.
  bonusUrl: string;
  // Right-hand side of the meta row: the countdown, or the date on a past-day link.
  meta: ReactNode;
  theme: ThemeMode;
  // Undefined while a season is active: seasons are dark-only, so the toggle is hidden.
  onToggleTheme?: () => void;
  onHelp: () => void;
}

export function Header({ country, houseNumber, bonusUrl, meta, theme, onToggleTheme, onHelp }: HeaderProps) {
  const { word, name } = COUNTRY[country];
  const chipText = houseNumber === null ? `${word} · ${name}` : `${word} Nº ${houseNumber} · ${name}`;
  const chipBody = (
    <>
      <span className="flag" aria-hidden="true" />
      <span className="chip__text">{chipText}</span>
    </>
  );

  return (
    <header className="header">
      <div className="header__row">
        <h1 className="title">{APP_TITLE}</h1>
        {onToggleTheme && (
          <button
            className="icon-btn"
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            <SunIcon className="i-sun" />
            <MoonIcon className="i-moon" />
          </button>
        )}
        <button
          className="icon-btn icon-btn--q"
          type="button"
          onClick={onHelp}
          aria-label="How to play"
          aria-haspopup="dialog"
        >
          ?
        </button>
      </div>
      <div className="meta">
        {bonusUrl ? (
          <a
            className="chip"
            href={bonusUrl}
            target="_blank"
            rel="noopener noreferrer"
            // Starts with the visible text so screen readers still hear which casa this is.
            aria-label={`${chipText}. Bonus link`}
          >
            {chipBody}
          </a>
        ) : (
          <span className="chip">{chipBody}</span>
        )}
        <span className="meta__right">{meta}</span>
      </div>
    </header>
  );
}
