// Convert every property photo from PNG to WebP, and every photo clip from MP4 to an
// *animated* WebP, in place.
//
// Walks src/properties/<slug>/ and handles two kinds of source file:
//   photo-N.png  ->  photo-N.webp   (still; the .png is deleted afterwards)
//   photo-N.mp4  ->  photo-N.webp   (animated; the .mp4 is always KEPT as the master)
// The app discovers images via import.meta.glob (which already matches .webp), so no code
// changes are needed once the files are swapped. An animated .webp renders in the ordinary
// <img>, and auto-plays + loops the moment the player reaches that photo — nothing else to wire up.
//
//   node scripts/png-to-webp.mjs            # convert + delete the .png files
//   node scripts/png-to-webp.mjs --keep     # convert but keep the .png files
//   node scripts/png-to-webp.mjs --dry-run  # report what would happen, change nothing
//   node scripts/png-to-webp.mjs --force    # re-encode videos even if the .webp is up to date
//
// Stills go through sharp as before; the video step needs **ffmpeg on PATH** and is skipped
// with a warning if it isn't installed. A clip whose .webp is already newer than its .mp4 is
// left alone, so re-running this after adding one PNG doesn't re-encode every video.
//
// Tunables: lossy quality (visually lossless ~80) and a max width so oversized photos
// are downscaled to something close to what the page actually displays. Video has its own
// fps/quality/width knobs, since an animated webp pays for every single frame.

import { readdir, stat, unlink } from 'node:fs/promises';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import sharp from 'sharp';

const run = promisify(execFile);

const QUALITY = 80;
const MAX_WIDTH = 1280; // covers the zoom/lightbox view; inline is only ~448px

// ── Animated-webp (video) settings ──────────────────────────────────────────────────────
// Every frame is a full image, so these trade smoothness and size far more aggressively
// than the stills above. A ~4s clip at these settings lands around 1-2 MB.
const VIDEO_FPS = 16;
const VIDEO_QUALITY = 55; // libwebp -q:v
const VIDEO_COMPRESSION = 6; // libwebp -compression_level (0-6; higher = slower + smaller)
const VIDEO_MAX_WIDTH = 1000;
const VIDEO_WARN_BYTES = 4 * 1024 * 1024; // nag when one clip encodes bigger than this

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROPERTIES_DIR = join(ROOT, 'src', 'properties');

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const keepPng = args.has('--keep');
const force = args.has('--force');

const fmtKB = (bytes) => `${(bytes / 1024).toFixed(0)} KB`;

// Collect every file under src/properties/ whose filename passes `test`, recursively.
async function findFiles(dir, test) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await findFiles(full, test)));
    } else if (entry.isFile() && test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

const findPngs = (dir) => findFiles(dir, (name) => name.toLowerCase().endsWith('.png'));
// Only `photo-N.mp4` is a gameplay clip; any other video sitting in a folder is left alone.
const findVideos = (dir) => findFiles(dir, (name) => /^photo-.+\.mp4$/i.test(name));

const webpFor = (file) => file.replace(/\.(png|mp4)$/i, '.webp');
const mtimeOf = (file) => stat(file).then((s) => s.mtimeMs, () => 0);

// Encode one photo-N.mp4 as an animated photo-N.webp. `-loop 0` loops it forever and `-an`
// drops the audio track (an <img> can't play sound anyway).
function encodeVideo(mp4) {
  return run('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-i', mp4,
    '-vf', `fps=${VIDEO_FPS},scale=min(${VIDEO_MAX_WIDTH}\\,iw):-2:flags=lanczos`,
    '-c:v', 'libwebp',
    '-q:v', String(VIDEO_QUALITY),
    '-compression_level', String(VIDEO_COMPRESSION),
    '-loop', '0',
    '-an',
    webpFor(mp4),
  ]);
}

// Convert every photo-N.mp4 to an animated webp. Runs after the PNG pass, so that if a
// folder somehow holds both photo-N.png and photo-N.mp4 the video wins (and we say so).
async function convertVideos(pngTargets) {
  const videos = await findVideos(PROPERTIES_DIR);
  if (videos.length === 0) return;

  console.log(
    `\n${videos.length} video(s) found. fps=${VIDEO_FPS}, quality=${VIDEO_QUALITY}, ` +
      `maxWidth=${VIDEO_MAX_WIDTH}${dryRun ? '  [dry run]' : ''}\n`,
  );

  if (!dryRun) {
    try {
      await run('ffmpeg', ['-version']);
    } catch {
      console.log(
        '  SKIPPED: ffmpeg is not on PATH. Install it (https://ffmpeg.org/download.html) and\n' +
          '  re-run — the .png conversion above already finished.',
      );
      return;
    }
  }

  for (const mp4 of videos) {
    const webp = webpFor(mp4);
    const before = (await stat(mp4)).size;

    if (pngTargets.has(webp)) {
      console.log(`  ! ${basename(mp4)} and ${basename(mp4).replace(/\.mp4$/i, '.png')} both exist — the video wins.`);
    } else if (!force && (await mtimeOf(webp)) > (await mtimeOf(mp4))) {
      console.log(`skip (up to date)  ${mp4}`);
      continue;
    }

    if (dryRun) {
      console.log(`would convert  ${mp4}  (${fmtKB(before)})`);
      continue;
    }

    await encodeVideo(mp4);
    const after = (await stat(webp)).size;
    console.log(`${mp4}\n  ${fmtKB(before)} -> ${fmtKB(after)} animated webp  (.mp4 kept as the master)`);
    if (after > VIDEO_WARN_BYTES) {
      console.log(
        `  ! that is big for one photo slot — shorten the clip, or lower VIDEO_FPS /\n` +
          `    VIDEO_QUALITY / VIDEO_MAX_WIDTH at the top of scripts/png-to-webp.mjs.`,
      );
    }
  }
}

async function main() {
  const pngs = await findPngs(PROPERTIES_DIR);
  // Every .webp this run writes from a .png — the video pass checks it for collisions.
  const pngTargets = new Set(pngs.map(webpFor));

  if (pngs.length === 0) {
    console.log('No .png files found under src/properties/ — nothing to convert.');
  } else {
    console.log(
      `Found ${pngs.length} .png file(s). quality=${QUALITY}, maxWidth=${MAX_WIDTH}` +
        `${dryRun ? '  [dry run]' : ''}${keepPng ? '  [keeping .png]' : ''}\n`,
    );

    let beforeTotal = 0;
    let afterTotal = 0;

    for (const png of pngs) {
      const webp = webpFor(png);
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

  await convertVideos(pngTargets);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
