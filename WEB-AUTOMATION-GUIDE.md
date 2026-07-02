# Automating a bot-protected website — a transferable playbook

This is a generalized guide to the approach used in `scripts/autofill-config.mjs` and
`scripts/fetch-photos.mjs`, which scrape structured data and full-resolution images out of
**idealista** (a real-estate site sitting behind **DataDome** bot protection). Hand this file
to a fresh Claude Code instance that needs to automate a *different* website and it should be
able to follow the same method instead of reinventing it.

The idealista scripts are the worked example throughout. Wherever you see "idealista" or
"DataDome", substitute your target site and its protection.

---

## 0. The core problem and the shape of the solution

A plain `fetch()` of a protected listing page returns **403** — the HTML is gated by a bot
guard that fingerprints the client (TLS, headers, JS environment) and may interpose a
**slider/captcha** challenge. You cannot get the content with HTTP alone.

The solution has three moving parts:

1. **Drive a real, installed Chrome** (not a headless stock browser) via Playwright, with the
   automation fingerprints stripped, so the page believes a human is browsing.
2. **Let a human solve the one-time challenge** by running the browser *visibly* and pausing
   the script until the page is past the guard. A **persistent profile** keeps the
   "you're cleared" cookie so subsequent runs rarely re-challenge.
3. **Extract data three ways** — DOM scraping, network-request interception, and `<meta>`
   tags — then pull any heavy assets (images) from the site's **CDN**, which is usually
   *not* protected and answers a normal `fetch()`.

Keep the expensive, fragile part (the browser) doing the minimum: get past the guard and
surface the ground-truth URLs / DOM. Do the bulk download with cheap plain `fetch()`.

---

## 1. Tooling choices (and why)

```js
import { chromium } from 'playwright-core';
```

- **`playwright-core`, not `playwright`** — `-core` ships no bundled browsers, so install is
  light. You rely on the user's **already-installed Chrome** instead (see `channel` below).
- **`channel: 'chrome'`** — uses the real Google Chrome on the machine, not Playwright's
  Chromium build. Real Chrome has a more "normal" fingerprint and no separate download step.
- **`launchPersistentContext(PROFILE_DIR, …)`** — a persistent on-disk profile (gitignored,
  e.g. `scripts/.pw-chrome-profile`). The clearance cookie set after solving a challenge
  survives between runs, so the human usually solves the puzzle **once, ever**, not once per
  run.
- **`sharp`** — only in the photo script, for resize/crop of downloaded images. Orthogonal to
  the automation; swap for whatever post-processing your assets need.

---

## 2. Looking like a human, not a robot

DataDome (and most guards) check several "is this automated?" tells. The launch options below
neutralize the obvious ones:

```js
const ctx = await chromium.launchPersistentContext(PROFILE_DIR, {
  headless,                                   // false by DEFAULT — see §3
  channel: 'chrome',
  viewport: { width: 1400, height: 1000 },
  ignoreDefaultArgs: ['--enable-automation'], // drop the "Chrome is being controlled" banner/flag
  args: ['--disable-blink-features=AutomationControlled'], // hide the AutomationControlled blink feature
});

// Belt-and-braces: blank out navigator.webdriver before ANY page script runs.
await ctx.addInitScript(() => {
  Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
});
```

Why each one:
- **`ignoreDefaultArgs: ['--enable-automation']`** — Playwright normally launches Chrome with
  `--enable-automation`, which sets `navigator.webdriver = true` and other tells. Removing it
  is the single most important anti-detection step.
- **`--disable-blink-features=AutomationControlled`** — suppresses another fingerprint the
  guard reads.
- **`addInitScript` hiding `navigator.webdriver`** — runs *before* page scripts on every
  navigation, so even if something re-sets the flag, the page sees `undefined`.

**Pacing like a person.** Guards also flag "superhuman speed". Between page loads, wait a
randomized human-ish interval, and trigger lazy content by actually scrolling:

```js
const humanPause = () => page.waitForTimeout(1800 + Math.floor(Math.random() * 2200)); // ~1.8–4s
// …and to load content that only appears on scroll:
for (let y = 0; y < 12 && !done; y++) { await page.mouse.wheel(0, 1400); await page.waitForTimeout(400); }
```

---

## 3. Headful by default: let the human clear the gate

The browser opens **visibly** (`headless: false`) unless `--headless` is passed. That is
deliberate: when the guard shows its slider/captcha, **a person solves it in the real window**
and the script just *waits* for the page to become real content.

The pattern is a **detect-block / wait-loop**:

```js
// 1) Define "is this the challenge page rather than real content?"
const isBlocked = () => page.evaluate(() =>
  !!document.querySelector('iframe[src*="captcha"], iframe[src*="geo.captcha-delivery"]') ||
  /slide right|verifica|protect your access/i.test(document.body?.innerText || ''));

// 2) Define "is the real content here yet?" — pick a selector that ONLY exists on a good page.
const isReady = () => page.evaluate(() => !!document.querySelector('h1')); // or og:image, a price node, …

// 3) Poll for up to ~3 minutes; prompt the human ONCE when first blocked.
let prompted = false;
for (let i = 0; i < 180; i++) {
  if (await isReady().catch(() => false)) break;
  if (!prompted && await isBlocked().catch(() => false)) {
    console.log('  ⚠  Solve the slider in the Chrome window; the script will continue automatically.');
    prompted = true;
  }
  await page.waitForTimeout(1000);
}
```

**Warm-up load.** Hit the main listing/page once at the very start so any challenge is solved
**up front, once for the whole run**, and the clearance cookie lands in the profile *before*
you fan out across many sub-pages:

```js
console.log('  opening page (solve the slider once if it appears)...');
await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });
// …then run the wait-loop above before doing any real work.
```

`--headless` exists for when you're confident the cookie is already warm (e.g. re-runs), but
the first time on a new machine you want headful.

---

## 4. The three extraction strategies (use whichever fits the datum)

Different facts live in different places. The idealista scripts use all three:

### a) DOM scraping — for visible text on the page
Run a function *inside the page* with `page.evaluate` and read known selectors. Be defensive:
normalize whitespace, fall back across selectors, return a plain object.

```js
const info = await page.evaluate(() => {
  const txt = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : null);
  const lines = [...document.querySelectorAll('.details-property li')].map(txt).filter(Boolean);
  const find = (re) => { for (const l of lines) { const m = l.match(re); if (m) return m[1]; } return null; };
  return {
    location: txt(document.querySelector('.main-info__title-minor')),
    livingM2: find(/^([\d.,]+)\s*m²/),
    rooms:    find(/^(\d+)\s*rooms?\b/i),
    // …price has a primary selector with a regex fallback over body text:
    priceText: txt(document.querySelector('.info-data-price'))
               || (document.body.innerText.match(/([\d.,]+)\s*€/) || [])[0] || '',
  };
});
```
Tips: prefer **stable class names** over nth-child paths; always provide a **regex fallback**
over `body.innerText` for critical fields; do the parsing (e.g. `parseInt` after stripping
non-digits) back in Node, not in the page.

### b) Network-request interception — for data the page fetches but doesn't show as text
Some values only exist inside a background request (an API call, a tile/static-map URL).
Listen on `page.on('request')` and scrape the value out of the **URL** as it flies by. On
idealista the property's exact lat/lng is only in the Google **static-map** request fired on
scroll:

```js
let coords = null;
page.on('request', (r) => {
  if (coords) return;
  const m = r.url().match(/staticmap\?[^"]*?center=(-?\d+\.\d+)(?:%2C|,)(-?\d+\.\d+)/i);
  if (m) coords = [parseFloat(m[1]), parseFloat(m[2])];
});
// …then SCROLL to make the page fire that request (see §2 scroll snippet), and wait for `coords`.
```
This is the highest-leverage trick: **the data you want is often already in a request the
page makes** — you just have to watch the network and trigger the request (scroll, click,
hover). Use `page.on('response')` instead if you need the body, not just the URL.

### c) `<meta>` / `og:` tags — for the canonical URL of an asset
Server-rendered `<head>` tags are stable ground truth. idealista's per-photo page renders the
exact image URL into `og:image`:

```js
const readOg = () => page.evaluate(() =>
  document.querySelector('meta[property="og:image"]')?.content ?? null);
```

---

## 5. Download heavy assets from the (unprotected) CDN with plain fetch

The guard protects the **HTML pages**, but the **asset CDN** is usually wide open. So once the
browser has handed you an image URL (via `og:image`), download the bytes with an ordinary
`fetch()` — no browser needed:

```js
const imgUrl = toMaxRes(ogImage);       // upgrade the URL to the largest variant first (below)
const res = await fetch(imgUrl);
if (!res.ok) { /* handle */ }
const buf = Buffer.from(await res.arrayBuffer());
```

**URL-token manipulation for max resolution.** CDNs encode size in the path/query. Rewrite the
token to the largest variant before downloading:

```js
const MAX_TOKEN = 'WEB_DETAIL';
const toMaxRes = (url) => url.replace(/\/blur\/[^/]+\//, `/blur/${MAX_TOKEN}/`);
```
Inspect a few real asset URLs to learn the size token, then force it to the biggest value.

---

## 6. Robustness & ergonomics that matter in practice

- **Always `await ctx.close()` in a `finally`** so a crash mid-run doesn't leak a Chrome.
- **Bound every wait** (`timeout: 60_000` on `goto`, capped poll loops) so a permanent block
  fails loudly instead of hanging forever.
- **Per-item failure is non-fatal**: log `FAILED` for one photo and continue; set
  `process.exitCode = 1` at the end if any item failed, so callers/CI can tell.
- **Idempotent writes**: before saving `photo-3.png`, delete any existing `photo-3.*` so a
  re-run cleanly replaces rather than accumulating stale variants.
- **Preserve unknown fields** when rewriting a config: rebuild in canonical key order but copy
  over any key you didn't scrape (`for (const k of Object.keys(cfg)) if (!(k in out)) out[k] = cfg[k]`).
- **Mark gaps, don't guess**: when a field isn't found, write a searchable placeholder
  (`<INSERT HINT HERE>`) and keep the existing value rather than overwriting with junk. The
  output is a **draft a human finalizes**.
- **Windows `.bat` quoting quirk**: a `.bat` passing `%~dp0` (ends in `\`) can leak a trailing
  `"` into the argument. Strip stray quotes from path args: `folderArg.replace(/"/g, '').trim()`.
- **Wrap each script in a per-target `.bat`** so the non-technical workflow is "double-click".
  Number them if order matters (`1_autofill.bat`, then `2_run-fetch.bat`).
- **Gitignore the profile dir** (`scripts/.pw-chrome-profile`) — it holds cookies/session.

---

## 7. Recipe for pointing this at a NEW website

1. **Probe first.** Try a plain `fetch()` / `curl`. If it returns the real HTML, you may not
   need a browser at all — scrape directly. If you get 403 / a challenge page, continue.
2. **Identify the guard** (DataDome, Cloudflare, PerimeterX, hCaptcha…) from the challenge
   markup — it tells you what `isBlocked()` should look for (iframe `src`, body text).
3. **Launch headful Chrome** with the §2 anti-detection options + persistent profile. Navigate
   to one page and confirm you can get past the gate by hand.
4. **Pin down `isReady()`** — a selector or meta tag that exists **only** on a good page — and
   build the §3 warm-up + wait-loop around it.
5. **Locate each datum** and pick its strategy: visible text → DOM (§4a); something the page
   fetches → network interception (§4b), and figure out what action triggers that request;
   asset URL → meta tag (§4c).
6. **Find the CDN size token** from a sample asset URL; download assets with plain `fetch()`
   (§5), not the browser.
7. **Add the robustness layer** (§6): `finally`-close, bounded waits, per-item failure,
   idempotent writes, placeholders for gaps, field preservation.
8. **Pace politely** (§2): randomized pauses, real scrolling. Don't hammer; you're a guest.

---

## 8. Quick reference — the load-and-clear skeleton

```js
import { chromium } from 'playwright-core';

const ctx = await chromium.launchPersistentContext(PROFILE_DIR, {
  headless: false, channel: 'chrome', viewport: { width: 1400, height: 1000 },
  ignoreDefaultArgs: ['--enable-automation'],
  args: ['--disable-blink-features=AutomationControlled'],
});
await ctx.addInitScript(() => Object.defineProperty(navigator, 'webdriver', { get: () => undefined }));
const page = ctx.pages()[0] ?? (await ctx.newPage());

try {
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });

  let prompted = false;                            // wait past the guard (human solves once)
  for (let i = 0; i < 180; i++) {
    if (await page.evaluate(() => !!document.querySelector('h1')).catch(() => false)) break;
    const blocked = await page.evaluate(() =>
      !!document.querySelector('iframe[src*="captcha"]')).catch(() => false);
    if (blocked && !prompted) { console.log('⚠  solve the challenge in the window…'); prompted = true; }
    await page.waitForTimeout(1000);
  }

  // …extract via DOM (§4a) / network (§4b) / meta (§4c); download assets via fetch (§5)…
} finally {
  await ctx.close();
}
```

---

### A note on responsible use
This technique is for sites **you are permitted to access** (your own listings, public data
you're allowed to collect, your client's properties). It mimics a human and asks a human to
solve any human-verification step — it does **not** defeat captchas programmatically. Respect
robots.txt / terms where they apply, keep the request rate human, and don't use it to evade
access controls you're not authorized to pass.
