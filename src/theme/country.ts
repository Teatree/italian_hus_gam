import { DEFAULT_TITLE_ICON } from '../admin';
import type { PropertyData } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
//  COUNTRIES
//  A house's country comes from data its config already has: the title-icon filename
//  ("spain_icon.png"), with the share flag as a fallback. Nothing new to author per house.
//
//  The country sets <html data-country="…">, which picks the accent colour, the shutter
//  colour and the CSS flag (tokens.css), plus the chip text ("Maison Nº 12 · France") and the
//  confetti colours. It does NOT touch the share flag — that stays whatever the config says,
//  including the 🇮🇪 running joke.
//
//  To add a country: one [data-country="xx"] line in src/styles/tokens.css, one entry in
//  COUNTRY below, and its "<name>_icon" / flag emoji in the two lookup tables.
// ─────────────────────────────────────────────────────────────────────────────

export type CountryCode = 'it' | 'es' | 'pt' | 'fr' | 'gr' | 'fi';

interface Country {
  name: string; // the country's own name for itself
  word: string; // its word for "house"
  flag: string[]; // flag colours, used for the win confetti
}

export const COUNTRY: Record<CountryCode, Country> = {
  it: { name: 'Italia', word: 'Casa', flag: ['#009246', '#F4F5F0', '#CE2B37'] },
  es: { name: 'España', word: 'Casa', flag: ['#AA151B', '#F1BF00', '#AA151B'] },
  pt: { name: 'Portugal', word: 'Casa', flag: ['#046A38', '#DA291C', '#FFE900'] },
  fr: { name: 'France', word: 'Maison', flag: ['#0055A4', '#F4F5F0', '#EF4135'] },
  gr: { name: 'Hellas', word: 'Spíti', flag: ['#0D5EAF', '#F4F5F0', '#0D5EAF'] },
  fi: { name: 'Suomi', word: 'Talo', flag: ['#002F6C', '#F4F5F0', '#002F6C'] },
};

export const DEFAULT_COUNTRY: CountryCode = 'it';

// "<name>_icon.png" → country.
const ICON_COUNTRY: Record<string, CountryCode> = {
  italy: 'it',
  spain: 'es',
  portugal: 'pt',
  france: 'fr',
  greece: 'gr',
  finland: 'fi',
};

// Share flag → country. 🇮🇪 is deliberately absent: it is the default joke flag on Italian houses.
const FLAG_COUNTRY: Record<string, CountryCode> = {
  '🇮🇹': 'it',
  '🇪🇸': 'es',
  '🇵🇹': 'pt',
  '🇫🇷': 'fr',
  '🇬🇷': 'gr',
  '🇫🇮': 'fi',
};

function fromIcon(file: string | undefined): CountryCode | null {
  const name = /^([a-z]+)_icon\./i.exec(file ?? '')?.[1]?.toLowerCase();
  return (name && ICON_COUNTRY[name]) || null;
}

let warned = false;

// The country a house is dressed as. Unknown or missing → Italy.
export function countryOf(house: Pick<PropertyData, 'titleIcon' | 'shareFlag'> | null): CountryCode {
  if (!house) return DEFAULT_COUNTRY;
  const code =
    fromIcon(house.titleIcon) ??
    (house.shareFlag ? FLAG_COUNTRY[house.shareFlag] : undefined) ??
    fromIcon(house.titleIcon ? undefined : DEFAULT_TITLE_ICON);
  if (code) return code;
  if (import.meta.env.DEV && !warned) {
    warned = true;
    console.warn(
      `[country] no country known for titleIcon "${house.titleIcon}" / shareFlag "${house.shareFlag}" — using Italy.`,
    );
  }
  return DEFAULT_COUNTRY;
}
