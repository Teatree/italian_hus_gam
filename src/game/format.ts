const euro = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

// Format a number as euros with comma grouping, e.g. 685000 -> "€685,000".
export function formatEuro(value: number): string {
  return euro.format(value);
}

// The compact value shown under a try circle: "650k" below a million, "1.5M" / "2M" / "12.3M"
// from a million up (one decimal, a trailing ".0" dropped). Values that would round up to
// "1000k" read as "1M".
export function formatShortEuro(value: number): string {
  if (value >= 999_500) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  return `${Math.round(value / 1000)}k`;
}

// Parse a free-form price the player typed (strips €, spaces, thousands separators).
// Returns null if there is no usable number.
export function parsePrice(input: string): number | null {
  const cleaned = input.replace(/[^0-9]/g, '');
  if (cleaned === '') return null;
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// The most digits a guess can have (so the largest guess is €999,999,999).
export const MAX_PRICE_DIGITS = 9;

// What the price field keeps of whatever was typed or pasted: digits only, no leading zeros,
// capped at MAX_PRICE_DIGITS. "€ 1.250.000" -> "1250000", "450k" -> "450", "000450000" -> "450000".
export function cleanPriceDigits(input: string): string {
  return input.replace(/[^0-9]/g, '').replace(/^0+/, '').slice(0, MAX_PRICE_DIGITS);
}

// Those digits as the field shows them, with comma grouping: "450000" -> "450,000".
// Returns "" when there are no digits, so the placeholder stays visible.
export function formatPriceDigits(digits: string): string {
  return digits === '' ? '' : Number(digits).toLocaleString('en-US');
}
