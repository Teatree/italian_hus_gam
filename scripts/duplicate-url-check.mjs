// Guard against reusing the same listing across two properties.
//
// Both authoring scripts (autofill-config.mjs, fetch-photos.mjs) call this before doing
// any work: if another property folder's config.json points at the same listing, they
// stop with a warning naming the offending folder(s). Comparison is by the idealista
// numeric listing id when present (so trailing slashes, language prefixes, or query
// params don't hide a duplicate), falling back to the normalized URL string.

import { readdir, readFile } from 'node:fs/promises';
import { join, dirname, resolve } from 'node:path';

// Canonical identity of a listing URL.
export function listingKey(url) {
  const m = String(url).match(/\/(?:immobile|inmueble|imovel|imóvel|property)\/(\d+)/i);
  if (m) return `idealista:${m[1]}`;
  return String(url).trim().toLowerCase().replace(/\/+$/, '');
}

// Returns the paths of every OTHER property folder whose config.json uses the same
// listing as `propertyUrl`. Walks propertiesDir recursively (month subfolders and all).
export async function findDuplicateUrl(propertiesDir, currentFolder, propertyUrl) {
  const key = listingKey(propertyUrl);
  const current = resolve(currentFolder);
  const dupes = [];

  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.name === 'config.json' && resolve(dirname(full)) !== current) {
        try {
          const cfg = JSON.parse(await readFile(full, 'utf8'));
          if (cfg.propertyUrl && listingKey(cfg.propertyUrl) === key) dupes.push(dirname(full));
        } catch {
          // unreadable/unparseable config — not this guard's problem
        }
      }
    }
  }

  await walk(propertiesDir);
  return dupes;
}
