const euro = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

// Format a number as euros with comma grouping, e.g. 685000 -> "€685,000".
export function formatEuro(value: number): string {
  return euro.format(value);
}

// Parse a free-form price the player typed (strips €, spaces, thousands separators).
// Returns null if there is no usable number.
export function parsePrice(input: string): number | null {
  const cleaned = input.replace(/[^0-9]/g, '');
  if (cleaned === '') return null;
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}
