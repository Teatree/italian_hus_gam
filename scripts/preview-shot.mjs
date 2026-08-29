// Render one property's game page and save it as a preview screenshot.
//
// Authoring-time only: boots the Vite dev server with this property forced as the active
// puzzle, opens it in Chrome, and writes a full-page screenshot next to the config as
// preview.webp. Nothing in the app ever reads that file — it exists purely so you can
// eyeball a scheduled house (photo 1, first hint, map, layout) without waiting for its date.
//
//   node scripts/preview-shot.mjs src/properties/2026_08/31_08_26
//   node scripts/preview-shot.mjs src/properties/2026_08/31_08_26 --mobile
//   node scripts/preview-shot.mjs src/properties/2026_08/31_08_26 --show   # visible browser
//
// Each property folder has a 3_preview.bat that calls this with its own path, so the usual
// workflow is just double-clicking that .bat (after 1_autofill and 2_run-fetch).
//
// The property is selected via VITE_OVERRIDE_SLUG, which src/admin.ts layers on top of the
// hand-edited OVERRIDE_SLUG. It only ever exists in this script's dev-server process, so a
// scheduled house can never leak into a real build this way. Analytics is muted for the run
// (VITE_ANALYTICS_URL='') so preview shots don't append rows to the Google Sheet.

import { readFile, writeFile, stat } from 'node:fs/promises';
import { join, dirname, resolve, basename, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { chromium } from 'playwright-core';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// Desktop is the default; --mobile renders the narrow single-column layout instead.
const DESKTOP = { width: 1280, height: 900, deviceScaleFactor: 2, out: 'preview.webp' };
const MOBILE = { width: 430, height: 932, deviceScaleFactor: 3, out: 'preview-mobile.webp' };

const QUALITY = 82; // webp quality for the saved screenshot
const MAX_WIDTH = 1600; // cap the retina-scaled shot so the file stays small

const args = process.argv.slice(2);
const mobile = args.includes('--mobile');
const headless = !args.includes('--show');
const folderArg = args.find((a) => !a.startsWith('--'));

function fail(msg) {
  console.error(`\n✖ ${msg}`);
  process.exit(1);
}

const fmtKB = (bytes) => `${(bytes / 1024).toFixed(0)} KB`;

// Ask the OS for a free port by binding to 0, then hand it to Vite (--strictPort).
function freePort() {
  return new Promise((res, rej) => {
    const srv = createServer();
    srv.once('error', rej);
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => res(port));
    });
  });
}

// Start `vite` on `port` with this property forced active. Resolves once it answers.
async function startDevServer(port, slug) {
  const child = spawn(
    process.execPath,
    [join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js'),
      '--host', '127.0.0.1', '--port', String(port), '--strictPort', '--clearScreen', 'false'],
    {
      cwd: ROOT,
      env: { ...process.env, VITE_OVERRIDE_SLUG: slug, VITE_ANALYTICS_URL: '' },
      stdio: ['ignore', 'ignore', 'pipe'],
    },
  );
  let stderr = '';
  child.stderr.on('data', (b) => (stderr += b));

  const url = `http://127.0.0.1:${port}/`;
  for (let i = 0; i < 120; i++) {
    if (child.exitCode !== null) fail(`the dev server exited early:\n${stderr}`);
    try {
      const res = await fetch(url);
      if (res.ok) return { child, url };
    } catch {
      // not listening yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  child.kill();
  fail(`the dev server never came up on ${url}\n${stderr}`);
}

async function main() {
  if (!folderArg) fail('Usage: node scripts/preview-shot.mjs <property-folder> [--mobile] [--show]');

  // Windows note: a .bat passing "%~dp0" (which ends in a backslash) can leak a trailing
  // double-quote into the argument. Strip stray quotes — paths can't contain them anyway.
  const folder = resolve(folderArg.replace(/"/g, '').trim());
  const slug = basename(folder);
  const view = mobile ? MOBILE : DESKTOP;
  const outPath = join(folder, view.out);

  let config;
  try {
    config = JSON.parse(await readFile(join(folder, 'config.json'), 'utf8'));
  } catch {
    fail(`Could not read ${join(folder, 'config.json')} — is "${folderArg}" a property folder?`);
  }
  if (!config.soldPrice) console.log(`  ⚠  ${slug}/config.json has no soldPrice — the page may look unfinished.`);

  console.log(
    `${slug}: rendering preview  ·  ${view.width}x${view.height} @${view.deviceScaleFactor}x` +
      `  ·  browser: ${headless ? 'headless' : 'visible'}\n`,
  );

  console.log('  starting the dev server...');
  const port = await freePort();
  const { child, url } = await startDevServer(port, slug);

  let browser;
  try {
    browser = await chromium.launch({ headless, channel: 'chrome' });
    const page = await browser.newPage({
      viewport: { width: view.width, height: view.height },
      deviceScaleFactor: view.deviceScaleFactor,
      isMobile: mobile,
      hasTouch: mobile,
    });

    console.log(`  opening ${url}`);
    await page.goto(url, { waitUntil: 'load', timeout: 120_000 });

    // The come-back screen means the override didn't take — screenshotting it is useless.
    await page
      .waitForSelector('input', { timeout: 60_000 })
      .catch(() => fail(`${slug} did not render a game page — is the folder name a valid slug?`));

    // Let every photo, icon and map tile finish so nothing is half-drawn in the shot.
    await page
      .waitForFunction(
        () => [...document.images].every((i) => i.complete && i.naturalWidth > 0),
        { timeout: 60_000 },
      )
      .catch(() => console.log('  ⚠  some images did not finish loading'));
    await page.waitForSelector('.leaflet-container', { timeout: 30_000 }).catch(() => {});
    // Wait for every tile to settle. A tile OpenStreetMap drops is still `complete` (with
    // naturalWidth 0), so a broken one can't hang this; the tile count varies with the
    // viewport (a phone-width map is only ~3 tiles), so don't require a minimum.
    await page
      .waitForFunction(
        () => {
          const tiles = [...document.querySelectorAll('img.leaflet-tile')];
          return tiles.length > 0 && tiles.every((t) => t.complete) && tiles.some((t) => t.naturalWidth > 0);
        },
        { timeout: 30_000 },
      )
      .catch(async () => {
        const tally = await page
          .evaluate(() => {
            const tiles = [...document.querySelectorAll('img.leaflet-tile')];
            return `${tiles.filter((t) => t.complete && t.naturalWidth > 0).length}/${tiles.length}`;
          })
          .catch(() => '?');
        console.log(`  ⚠  the map tiles did not finish loading (${tally} loaded)`);
      });
    await page.waitForTimeout(1200); // settle entrance transitions

    const png = await page.screenshot({ fullPage: true, type: 'png' });
    await writeFile(
      outPath,
      await sharp(png).resize({ width: MAX_WIDTH, withoutEnlargement: true }).webp({ quality: QUALITY }).toBuffer(),
    );
  } finally {
    await browser?.close().catch(() => {});
    child.kill();
  }

  console.log(`\n✔ ${relative(ROOT, outPath)}  (${fmtKB((await stat(outPath)).size)})`);
  console.log('  Preview only — the app ignores this file, and it is gitignored.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
