// Download a property's photos straight from its idealista listing into the folder.
//
// Reads one property folder's config.json and, for every entry in its `prop_pictures`
// map, opens the matching idealista photo page, grabs the full-resolution image, and
// saves it next to the config as photo-<key>.png (replacing any same-named photo).
//
//   node scripts/fetch-photos.mjs src/properties/08_06_26      # one folder
//   node scripts/fetch-photos.mjs src/properties/08_06_26 --headless
//
// Each property folder also has a run-fetch.bat that calls this with its own path, so the
// usual workflow is just double-clicking that .bat. PNGs are intentionally NOT converted
// to .webp here — run `npm run images:webp` afterwards for that step.
//
// `prop_pictures` maps the local photo slot to the idealista *foto* number, e.g.
//   "prop_pictures": { "1": 12, "2": 7, "3": 1 }
// means photo-1.png := listing .../foto/12/, photo-2.png := .../foto/7/, etc. The foto
// number is the 1-based position you see in the URL when clicking through the gallery.
//
// idealista's listing HTML is bot-protected (plain fetch gets a 403), so we drive a real
// Chrome via playwright-core to read each foto page's og:image tag — that tag is the
// ground-truth URL for that exact photo. The image CDN itself is not protected, so the
// bytes are pulled with a normal fetch. Chrome opens visibly (headful) by default so you
// can solve a captcha if idealista ever throws one; pass --headless to hide it.

import { readFile, readdir, unlink, mkdir } from 'node:fs/promises';
import { join, dirname, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import sharp from 'sharp';

// Required output size (px). idealista's largest native variant is ~1500x1125 (4:3); the
// target is 3:2, so we scale-to-fill and centre-crop (no distortion, small top/bottom trim).
const OUT_WIDTH = 1537;
const OUT_HEIGHT = 1023;

// idealista CDN size token that yields the biggest image (~1500px on the long edge).
const MAX_TOKEN = 'WEB_DETAIL';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
// Persistent Chrome profile so DataDome cookies survive between runs (fewer challenges).
const PROFILE_DIR = join(ROOT, 'scripts', '.pw-chrome-profile');

const args = process.argv.slice(2);
const headless = args.includes('--headless');
const folderArg = args.find((a) => !a.startsWith('--'));

function fail(msg) {
  console.error(`\n✖ ${msg}`);
  process.exit(1);
}

// Pull the foto page URL for a given foto number off the listing URL, e.g.
// https://www.idealista.it/en/immobile/33332936/  ->  .../immobile/33332936/foto/12/
function fotoPageUrl(propertyUrl, fotoNum) {
  return `${propertyUrl.replace(/\/+$/, '')}/foto/${fotoNum}/`;
}

// Force any idealista image URL to the largest size variant.
function toMaxRes(url) {
  return url.replace(/\/blur\/[^/]+\//, `/blur/${MAX_TOKEN}/`);
}

// Delete any existing photo-<key>.<ext> in the folder so the new one cleanly replaces it.
async function removeExisting(folder, key) {
  for (const name of await readdir(folder)) {
    if (new RegExp(`^photo-${key}\\.(png|webp|jpe?g|avif)$`, 'i').test(name)) {
      await unlink(join(folder, name));
    }
  }
}

async function main() {
  if (!folderArg) fail('Usage: node scripts/fetch-photos.mjs <property-folder> [--headless]');

  // Windows note: a .bat passing "%~dp0" (which ends in a backslash) can leak a trailing
  // double-quote into the argument. Strip stray quotes — paths can't contain them anyway.
  const folder = resolve(folderArg.replace(/"/g, '').trim());
  const slug = basename(folder);
  const configPath = join(folder, 'config.json');

  let config;
  try {
    config = JSON.parse(await readFile(configPath, 'utf8'));
  } catch {
    fail(`Could not read ${configPath} — is "${folderArg}" a property folder?`);
  }

  const { propertyUrl, prop_pictures: map } = config;
  if (!propertyUrl) fail(`${slug}/config.json has no "propertyUrl".`);
  if (!map || Object.keys(map).length === 0) {
    console.log(`${slug}: no "prop_pictures" in config.json — nothing to fetch.`);
    return;
  }
  if (!/idealista\.[a-z.]+/i.test(propertyUrl)) {
    fail(`${slug}: propertyUrl is not an idealista listing (${propertyUrl}). This script only supports idealista.`);
  }

  const entries = Object.entries(map);
  console.log(
    `${slug}: fetching ${entries.length} photo(s) from ${propertyUrl}\n` +
      `  output: ${OUT_WIDTH}x${OUT_HEIGHT} png  ·  browser: ${headless ? 'headless' : 'visible'}\n`,
  );

  await mkdir(PROFILE_DIR, { recursive: true });
  const ctx = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless,
    channel: 'chrome', // use the installed Chrome — no separate browser download
    viewport: { width: 1400, height: 1000 },
    // Strip the "this browser is automated" signals that trip idealista's DataDome guard.
    ignoreDefaultArgs: ['--enable-automation'],
    args: ['--disable-blink-features=AutomationControlled'],
  });
  // Belt-and-braces: hide navigator.webdriver before any page script runs.
  await ctx.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });
  const page = ctx.pages()[0] ?? (await ctx.newPage());

  // Is the current page idealista's DataDome verification (the slider puzzle), not real content?
  const isBlocked = () =>
    page.evaluate(() =>
      !!document.querySelector('iframe[src*="captcha"], iframe[src*="geo.captcha-delivery"]') ||
      /scorrere verso destra|slide right|protect your access|proteggere il tuo accesso|verifica/i.test(
        document.body?.innerText || '',
      ),
    );
  // og:image is server-rendered into <head> and points at this exact foto.
  const readOg = () =>
    page.evaluate(() => document.querySelector('meta[property="og:image"]')?.content ?? null);

  // Random human-ish pause so we don't hammer pages "at superhuman speed" (DataDome's words).
  const humanPause = () => page.waitForTimeout(1800 + Math.floor(Math.random() * 2200));

  // Wait until the current page is past any DataDome check; returns the foto's og:image (or null).
  // If the slider is shown it prompts once and waits (up to ~3 min) for the human to solve it.
  async function waitForFoto() {
    let prompted = false;
    for (let i = 0; i < 180; i++) {
      const og = await readOg().catch(() => null);
      if (og && /image\.master/.test(og)) return og;
      if (!prompted && (await isBlocked().catch(() => false))) {
        console.log(
          '    ⚠  idealista is showing its slider verification.\n' +
            '       → Solve it in the Chrome window; downloading will continue automatically.',
        );
        prompted = true;
      }
      await page.waitForTimeout(1000);
    }
    return null;
  }

  let ok = 0;
  try {
    // Warm-up: load the listing once so any verification is solved up front (one slider for the
    // whole run), and the DataDome clearance cookie is set in the profile before we fan out.
    console.log('  opening listing (solve the slider once if it appears)...');
    await page.goto(propertyUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    for (let i = 0; i < 180 && (await isBlocked().catch(() => false)); i++) {
      if (i === 0) console.log('    ⚠  solve the slider verification in the Chrome window to begin...');
      await page.waitForTimeout(1000);
    }
    console.log('');

    let first = true;
    for (const [key, fotoNum] of entries) {
      if (!first) await humanPause(); // pace requests like a person clicking through the gallery
      first = false;

      const pageUrl = fotoPageUrl(propertyUrl, fotoNum);
      console.log(`  photo-${key}  ← foto/${fotoNum}/`);
      await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });

      const ogImage = await waitForFoto();
      if (!ogImage) {
        const title = await page.title().catch(() => '');
        console.log(`    FAILED (no image — foto ${fotoNum} may not exist, or still blocked; title: "${title}")`);
        continue;
      }

      const imgUrl = toMaxRes(ogImage);
      const res = await fetch(imgUrl);
      if (!res.ok) {
        console.log(`    FAILED (image download ${res.status})`);
        continue;
      }
      const buf = Buffer.from(await res.arrayBuffer());

      await removeExisting(folder, key);
      const src = await sharp(buf).metadata();
      await sharp(buf)
        .resize(OUT_WIDTH, OUT_HEIGHT, { fit: 'cover', position: 'centre' })
        .png()
        .toFile(join(folder, `photo-${key}.png`));

      console.log(`    OK  (source ${src.width}x${src.height} → ${OUT_WIDTH}x${OUT_HEIGHT})`);
      ok++;
    }
  } finally {
    await ctx.close();
  }

  console.log(`\nDone. Saved ${ok}/${entries.length} photo(s) into ${slug}/.`);
  if (ok < entries.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
