import type { PropertyConfig, PropertyData } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
//  AUTO-DISCOVERY
//  Every folder under src/properties/<name>/ that contains a `config.json` becomes a
//  property automatically — no registration needed. The folder name is the slug (use the
//  DD_MM_YY date format to schedule it). Images in the folder are picked up and ordered by
//  filename (photo-1.png, photo-2.png, …).
//
//  To add a property: create src/properties/<DD_MM_YY>/ with a config.json and 6 images.
//  That's it.
// ─────────────────────────────────────────────────────────────────────────────

// All config.json files, eagerly loaded as parsed objects.
const configModules = import.meta.glob('./*/config.json', { eager: true }) as Record<
  string,
  { default: PropertyData }
>;

// All images, eagerly loaded as resolved (hashed) URL strings.
const imageModules = import.meta.glob('./*/*.{png,jpg,jpeg,webp,avif}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

// './04_06_26/config.json' -> '04_06_26'
function folderOf(path: string): string {
  return path.match(/^\.\/([^/]+)\//)?.[1] ?? '';
}

function byFilename(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

function buildRegistry(): Record<string, PropertyConfig> {
  const registry: Record<string, PropertyConfig> = {};

  for (const [path, mod] of Object.entries(configModules)) {
    const slug = folderOf(path);
    if (!slug) continue;

    const images = Object.entries(imageModules)
      .filter(([imgPath]) => folderOf(imgPath) === slug)
      .sort(([a], [b]) => byFilename(a, b))
      .map(([, url]) => url);

    const data = mod.default;
    registry[slug] = { slug, images, ...data };
  }

  return registry;
}

export const properties: Record<string, PropertyConfig> = buildRegistry();
