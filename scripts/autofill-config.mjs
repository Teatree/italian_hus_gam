// Autofill a property's config.json from its idealista listing.
//
// Reads the folder's config.json (which must already have `propertyUrl`), opens the listing,
// and fills in: coordinates, soldPrice, and a draft `facts` list — leaving blank anything it
// can't find. All other fields (propertyUrl, prop_pictures, titleIcon/titleIconUrl/shareFlag)
// are preserved. The result is a DRAFT: review/trim the facts to 6 and add your own flavour.
//
//   node scripts/autofill-config.mjs src/properties/2026_06/24_06_26      # one folder
//   node scripts/autofill-config.mjs src/properties/2026_06/24_06_26 --headless
//
// Each property folder has an autofill.bat that calls this with its own path, so the usual way
// is to double-click that .bat. Like the photo fetcher, idealista's DataDome may show a one-time
// slider in the (visible) Chrome window — solve it once at the start and it carries on.
//
// Facts follow the patterns used across the existing configs:
//   Located in <area>           ·  <N> m² of living space  ·  <rooms> rooms <baths> baths
//   Built in <year>             ·  <N> floors              ·  Land plot of <N> m²
//   Private Garden (if present) ·  Swimming Pool (if present)
// plus one *measured* fact (computed, not scraped): free-flow car time to the best nearby
// city, e.g. "1h 20m to Venice by Car" — skipped when the property is already in one.
// "Best" is not "closest": drive-time.mjs scores candidates on drive time against how
// notable they are, so a provincial capital can beat a bigger town that happens to be nearer.
//
// Fact order is randomized: slot 0 is always the location; the other 5 slots go to the
// priority facts (living space, built-in year, drive time) whenever available plus a random
// draw of the rest, shuffled. Losers of the draw are logged so you can swap them in by hand.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname, resolve, basename, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { findDuplicateUrl } from './duplicate-url-check.mjs';
import { driveTimeToNearestCity, formatDriveTime } from './drive-time.mjs';

// Prefix for the location fact. Your configs use both "Located in" and "Located near";
// "in" is the more common, so it's the default — change here if you prefer "near".
const LOCATION_PREFIX = 'Located in';

// Every property needs 6 facts; anything missing/unfound is written as this so you can spot
// (and search for) the gaps before publishing.
const PLACEHOLDER = '<INSERT HINT HERE>';

// Under this many minutes' drive to the nearest big city the property counts as being *in*
// that city, and the drive-time fact is never added.
const IN_CITY_MINUTES = 20;

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROFILE_DIR = join(ROOT, 'scripts', '.pw-chrome-profile');

const args = process.argv.slice(2);
const headless = args.includes('--headless');
const folderArg = args.find((a) => !a.startsWith('--'));

function fail(msg) {
  console.error(`\n✖ ${msg}`);
  process.exit(1);
}

// --- pure helpers (parsing the listing's characteristic lines into our fact strings) ---------

// First "<number> m²" line is the living area ("139 m² built"); the plot line starts with text.
function pick(lines, re) {
  for (const l of lines) {
    const m = l.match(re);
    if (m) return m;
  }
  return null;
}

// Split the found facts into `priority` (guaranteed a slot) and `optional` (enter a random
// draw for whatever slots remain). The location fact is handled separately — always slot 0.
function buildCandidates(info, driveTimeFact) {
  const priority = [];
  const optional = [];

  if (info.livingM2) priority.push(`${info.livingM2} m² of living space`);
  if (info.builtYear) priority.push(`Built in ${info.builtYear}`);
  if (driveTimeFact) priority.push(driveTimeFact);

  if (info.rooms && info.baths) optional.push(`${info.rooms} rooms ${info.baths} baths`);
  else if (info.rooms) optional.push(`${info.rooms} rooms`);
  if (info.floors) optional.push(`${info.floors} floors`);
  if (info.plotM2) optional.push(`Land plot of ${info.plotM2} m²`);
  if (info.garden) optional.push('Private Garden');
  if (info.pool) optional.push('Swimming Pool');

  return { priority, optional };
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Assemble the final 6: location first, then priorities + a random draw of optionals in
// random order, padded with the placeholder. Also returns the optionals that lost the draw.
function assembleFacts(info, { priority, optional }) {
  const location = info.location ? `${LOCATION_PREFIX} ${info.location}` : PLACEHOLDER;
  const drawn = shuffle(optional).slice(0, Math.max(0, 5 - priority.length));
  const facts = [location, ...shuffle([...priority, ...drawn])];
  while (facts.length < 6) facts.push(PLACEHOLDER);
  const dropped = optional.filter((f) => !drawn.includes(f));
  return { facts: facts.slice(0, 6), dropped };
}

// Serialize config the way the existing files are written: 2-space indent, coordinates inline.
function serialize(cfg) {
  let s = JSON.stringify(cfg, null, 2);
  s = s.replace(/"coordinates": \[\s*([-\d.]+),\s*([-\d.]+)\s*\]/, '"coordinates": [$1, $2]');
  return s + '\n';
}

async function main() {
  if (!folderArg) fail('Usage: node scripts/autofill-config.mjs <property-folder> [--headless]');

  const folder = resolve(folderArg.replace(/"/g, '').trim());
  const slug = basename(folder);
  const configPath = join(folder, 'config.json');

  let cfg;
  try {
    cfg = JSON.parse(await readFile(configPath, 'utf8'));
  } catch (e) {
    fail(`Could not read/parse ${slug}/config.json (${e.message}).`);
  }
  if (!cfg.propertyUrl) fail(`${slug}/config.json has no "propertyUrl" to read from.`);
  if (!/idealista\.[a-z.]+/i.test(cfg.propertyUrl)) {
    fail(`${slug}: propertyUrl is not an idealista listing. Autofill only supports idealista.`);
  }

  const dupes = await findDuplicateUrl(join(ROOT, 'src', 'properties'), folder, cfg.propertyUrl);
  if (dupes.length) {
    fail(
      `${slug}: this propertyUrl is already used by: ${dupes.map((d) => relative(ROOT, d)).join(', ')}\n` +
        `  Each property must be a unique listing — fix propertyUrl in config.json and re-run.`,
    );
  }

  console.log(`${slug}: reading ${cfg.propertyUrl}  (browser: ${headless ? 'headless' : 'visible'})\n`);

  await mkdir(PROFILE_DIR, { recursive: true });
  const ctx = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless,
    channel: 'chrome',
    viewport: { width: 1400, height: 1000 },
    ignoreDefaultArgs: ['--enable-automation'],
    args: ['--disable-blink-features=AutomationControlled'],
  });
  await ctx.addInitScript(() => Object.defineProperty(navigator, 'webdriver', { get: () => undefined }));
  const page = ctx.pages()[0] ?? (await ctx.newPage());

  // The map is a Google static map fetched on scroll; its center=lat,lng is the property.
  let coords = null;
  page.on('request', (r) => {
    if (coords) return;
    const m = r.url().match(/staticmap\?[^"]*?center=(-?\d+\.\d+)(?:%2C|,)(-?\d+\.\d+)/i);
    if (m) coords = [parseFloat(m[1]), parseFloat(m[2])];
  });

  let info;
  try {
    await page.goto(cfg.propertyUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });

    // Wait for real content; if the slider shows, prompt once and wait for the human.
    let prompted = false;
    for (let i = 0; i < 180; i++) {
      if (await page.evaluate(() => !!document.querySelector('h1'))) break;
      const blocked = await page
        .evaluate(() => !!document.querySelector('iframe[src*="captcha"], iframe[src*="geo.captcha-delivery"]'))
        .catch(() => false);
      if (blocked && !prompted) {
        console.log('  ⚠  Solve the slider verification in the Chrome window to begin...');
        prompted = true;
      }
      await page.waitForTimeout(1000);
    }

    // Scroll through to trigger the lazy map (sets `coords` via the request listener).
    for (let y = 0; y < 12 && !coords; y++) {
      await page.mouse.wheel(0, 1400);
      await page.waitForTimeout(400);
    }
    for (let i = 0; i < 10 && !coords; i++) await page.waitForTimeout(500);

    info = await page.evaluate(() => {
      const txt = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : null);
      const lines = [...document.querySelectorAll('.details-property li')].map((li) => txt(li)).filter(Boolean);
      const find = (re) => { for (const l of lines) { const m = l.match(re); if (m) return m[1]; } return null; };
      const has = (re) => lines.some((l) => re.test(l));
      const priceText =
        txt(document.querySelector('.info-data-price')) ||
        (document.body.innerText.match(/([\d.,]+)\s*€/) || [])[0] ||
        '';
      return {
        location: txt(document.querySelector('.main-info__title-minor')),
        priceText,
        livingM2: find(/^([\d.,]+)\s*m²/), // "139 m² built" — plot line starts with text, so excluded
        rooms: find(/^(\d+)\s*rooms?\b/i),
        baths: find(/^(\d+)\s*bathrooms?\b/i),
        builtYear: find(/^built in\s*(\d{4})/i),
        floors: find(/^(\d+)\s*floors?\b/i),
        plotM2: find(/land plot of\s*([\d.,]+)\s*m²/i),
        garden: has(/private garden/i),
        pool: has(/swimming pool/i) || has(/\bpool\b/i),
      };
    });
  } finally {
    await ctx.close();
  }

  const soldPrice = info.priceText ? parseInt(info.priceText.replace(/[^\d]/g, ''), 10) || null : null;

  // The measured fact: drive time to the nearest big city. [0, 0] is the "never filled"
  // default written by earlier runs, not a real location.
  const at = coords ?? cfg.coordinates;
  let driveTimeFact = null;
  let driveTimeNote;
  if (!at || (at[0] === 0 && at[1] === 0)) {
    driveTimeNote = 'skipped — no coordinates';
  } else {
    try {
      const { city, minutes, km, runnerUp } = await driveTimeToNearestCity(at);
      if (minutes < IN_CITY_MINUTES) {
        driveTimeNote = `skipped — property is in/near ${city} (~${Math.round(minutes)}m by car)`;
      } else {
        driveTimeFact = formatDriveTime(minutes, city);
        // The winner balances distance against how notable the place is, so it isn't always
        // the closest — show what it beat in case you'd rather have the runner-up.
        driveTimeNote = `${Math.round(km)} km by road`;
        if (runnerUp) driveTimeNote += `; beat ${runnerUp.city} (${Math.round(runnerUp.minutes)}m)`;
      }
    } catch (e) {
      driveTimeNote = `skipped — ${e.message}`;
    }
  }

  const { facts, dropped } = assembleFacts(info, buildCandidates(info, driveTimeFact));

  // Rebuild in the canonical field order, preserving everything we didn't scrape.
  const out = {};
  out.coordinates = coords ?? cfg.coordinates ?? [0, 0];
  out.mapZoom = cfg.mapZoom ?? 12;
  out.soldPrice = soldPrice ?? cfg.soldPrice ?? 0;
  out.propertyUrl = cfg.propertyUrl;
  if (cfg.prop_pictures) out.prop_pictures = cfg.prop_pictures;
  if (cfg.titleIcon) out.titleIcon = cfg.titleIcon;
  if (cfg.titleIconUrl) out.titleIconUrl = cfg.titleIconUrl;
  if (cfg.shareFlag) out.shareFlag = cfg.shareFlag;
  out.facts = facts;
  for (const k of Object.keys(cfg)) if (!(k in out)) out[k] = cfg[k]; // carry over anything else

  await writeFile(configPath, serialize(out));

  // Report.
  const mark = (v) => (v ? '✓' : '·');
  console.log('  filled:');
  console.log(`    ${mark(coords)} coordinates  ${coords ? coords.join(', ') : '(not found — kept existing)'}`);
  console.log(`    ${mark(soldPrice)} soldPrice    ${soldPrice ?? '(not found — kept existing)'}`);
  console.log(
    `    ${mark(driveTimeFact)} drive time   ${driveTimeFact ? `${driveTimeFact}  (${driveTimeNote})` : `(${driveTimeNote})`}`,
  );
  console.log('  facts (draft, randomly ordered — replace any ' + PLACEHOLDER + ' and tweak to taste):');
  facts.forEach((f, i) => console.log(`    [${i}] ${f}`));
  if (dropped.length) {
    console.log(`  also found but lost the random draw (swap in if you want): ${dropped.join(' · ')}`);
  }
  console.log(`\nWrote ${slug}/config.json. Review the facts, then you're done.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
