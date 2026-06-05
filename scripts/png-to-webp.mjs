// Convert every property photo from PNG to WebP, in place.
//
// Walks src/properties/<slug>/, finds *.png files, writes a same-named *.webp next to
// each, then deletes the original .png. The app discovers images via import.meta.glob
// (which already matches .webp), so no code changes are needed once the files are swapped.
//
//   node scripts/png-to-webp.mjs            # convert + delete the .png files
//   node scripts/png-to-webp.mjs --keep     # convert but keep the .png files
//   node scripts/png-to-webp.mjs --dry-run  # report what would happen, change nothing
//
// Tunables: lossy quality (visually lossless ~80) and a max width so oversized photos
// are downscaled to something close to what the page actually displays.

import { readdir, stat, unlink } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const QUALITY = 80;
const MAX_WIDTH = 1280; // covers the zoom/lightbox view; inline is only ~448px

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROPERTIES_DIR = join(ROOT, 'src', 'properties');

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const keepPng = args.has('--keep');

const fmtKB = (bytes) => `${(bytes / 1024).toFixed(0)} KB`;

// Collect every .png under src/properties/, recursively.
async function findPngs(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await findPngs(full)));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.png')) {
      out.push(full);
    }
  }
  return out;
}

async function main() {
  const pngs = await findPngs(PROPERTIES_DIR);
  if (pngs.length === 0) {
    console.log('No .png files found under src/properties/ — nothing to do.');
    return;
  }

  console.log(
    `Found ${pngs.length} .png file(s). quality=${QUALITY}, maxWidth=${MAX_WIDTH}` +
      `${dryRun ? '  [dry run]' : ''}${keepPng ? '  [keeping .png]' : ''}\n`,
  );

  let beforeTotal = 0;
  let afterTotal = 0;

  for (const png of pngs) {
    const webp = png.replace(/\.png$/i, '.webp');
    const before = (await stat(png)).size;
    beforeTotal += before;

    if (dryRun) {
      console.log(`would convert  ${png}  (${fmtKB(before)})`);
      continue;
    }

    await sharp(png)
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toFile(webp);

    const after = (await stat(webp)).size;
    afterTotal += after;

    if (!keepPng) await unlink(png);

    const saved = before - after;
    const pct = ((saved / before) * 100).toFixed(0);
    console.log(`${png}\n  ${fmtKB(before)} -> ${fmtKB(after)}  (-${pct}%)`);
  }

  if (!dryRun) {
    const savedTotal = beforeTotal - afterTotal;
    const pct = ((savedTotal / beforeTotal) * 100).toFixed(0);
    console.log(
      `\nDone. ${fmtKB(beforeTotal)} -> ${fmtKB(afterTotal)} ` +
        `(saved ${fmtKB(savedTotal)}, -${pct}%).` +
        `${keepPng ? '' : ' Original .png files removed.'}`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
