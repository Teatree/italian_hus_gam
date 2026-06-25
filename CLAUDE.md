# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> `AGENTS.md` is a verbatim mirror of this file for other agents — keep both in sync when editing.

## Commands

```bash
npm install
npm run dev          # Vite dev server at http://localhost:5173
npm run build        # tsc --noEmit type-check, then vite build -> ./dist
npm run preview      # serve the production ./dist build locally
npm run images:webp  # convert property photo-*.png to .webp in place (sharp; --keep, --dry-run)

# Authoring-time only (not part of the build):
node scripts/autofill-config.mjs src/properties/<DD_MM_YY> # fill coordinates/soldPrice/draft facts from idealista
node scripts/fetch-photos.mjs src/properties/<DD_MM_YY>    # download a property's photos from idealista
```

There is no test suite, linter, or formatter configured. `npm run build` (which runs `tsc --noEmit`) is the only automated check — run it to verify type-correctness after changes.

## Architecture

A fully static Vite + React + TypeScript daily-puzzle game (no backend of our own). Players guess an Italian house's sale price in up to `MAX_TRIES` (6) guesses; each wrong guess reveals one more photo and one more fact. A guess wins if it's within the **win margin**: ±`TOLERANCE` (10%) of the price, **capped at `TOLERANCE_CAP` (€200k)** so expensive houses don't get an absurdly wide window. Wrong guesses get a directional arrow, doubled ("way off") past `FAR_THRESHOLD` (30%) capped at `FAR_THRESHOLD_CAP` (€200k). All of these knobs live in `src/admin.ts`; the pure comparison logic is `evaluateGuess` in `src/game/logic.ts`.

The data flow is **content folders → build-time auto-discovery → date-based scheduling → single-game React tree**:

- **Content as folders (`src/properties/<DD_MM_YY>/`)** — Each puzzle is a folder containing `config.json` (`coordinates`, `mapZoom`, `soldPrice`, `propertyUrl`, `facts[]`, plus optional per-date theming `titleIcon`/`titleIconUrl`/`shareFlag` and an authoring-only `prop_pictures` map) plus `photo-*.webp` images (the discovery glob also accepts `png/jpg/jpeg/avif`). Adding a puzzle means creating a folder; there is **no registration step and no code change**. The folder name is the slug. Drop raw `photo-*.png` files and run `npm run images:webp` to convert/downscale them.

- **Photo fetching (`scripts/fetch-photos.mjs` + per-folder `2_run-fetch.bat`)** — Authoring-time helper that downloads a property's photos straight from its **idealista** listing instead of manual screenshots. `config.json`'s `prop_pictures` maps each local slot to an idealista *foto* number (`{ "1": 12 }` → `photo-1` from `…/foto/12/`); the script reads the foto page's `og:image` (ground truth for that photo), pulls the full-res image from the CDN, and saves `photo-N.png` at 1537×1023, **replacing any same-named `photo-N.*`**. It drives a **visible** Chrome via `playwright-core` (channel `chrome`) because idealista's **DataDome** blocks plain fetches and may show a one-time slider the human solves; a persisted profile lives at `scripts/.pw-chrome-profile` (gitignored). It does **not** convert to webp — that stays `npm run images:webp`. `prop_pictures`/the `.bat`s are ignored by the app at runtime.

- **Config autofill (`scripts/autofill-config.mjs` + per-folder `1_autofill.bat`)** — Authoring-time helper that fills `config.json` from the idealista listing named in `propertyUrl`: `coordinates` (from the listing's Google static-map `center=`, captured off the network), `soldPrice` (parsed from the price), and a **draft** `facts[]` (location subtitle, m², rooms/baths, year, floors, land plot, garden/pool) following the existing configs' wording. It always writes exactly 6 facts: it caps the list at 6 (extras are dropped and logged) and pads with `<INSERT HINT HERE>` for anything it couldn't find. Preserves all other fields and writes 2-space JSON with `coordinates` inline. Same visible-Chrome + DataDome-slider flow as the fetcher; the output is a draft to finalize. (The two `.bat`s are numbered `1_`/`2_` to suggest the order: autofill, then fetch photos.)

- **Auto-discovery (`src/properties/index.ts`)** — Uses Vite's `import.meta.glob` (eager) to collect all `config.json` files and all images at build time into a `properties` registry keyed by slug. Images are sorted by filename (numeric-aware), so `photo-1 … photo-6` order matters. The folder name slug doubling as a `DD_MM_YY` date is what links content to the schedule.

- **Scheduling (`src/game/schedule.ts` + `src/admin.ts`)** — `getScheduleInfo()` computes the current puzzle's `dateKey` (as `DD_MM_YY`) and the `nextResetMs` boundary. A "puzzle day" runs from `RESET_HOUR` (10:00) in `RESET_TIME_ZONE` (`Europe/Kyiv`, DST-aware) until the same time next day. The zone math is done manually via `Intl.DateTimeFormat` to handle DST correctly — do not replace it with naive `Date` offset arithmetic. `OVERRIDE_SLUG` in `admin.ts` forces a specific property regardless of date (testing only).

- **App shell (`src/App.tsx`)** — Resolves `slug = OVERRIDE_SLUG ?? dateKey`, looks it up in `properties`. No match → `ComeBackScreen` with countdown. A 1s interval reloads the page when `nextResetMs` passes so a new puzzle loads cleanly. The `<Game>` component is keyed by `property.slug` so changing the active property forces a clean remount with fresh state.

- **Game state (`<Game>` in `App.tsx`)** — All gameplay state (`guesses`, `status`, `selectedImage`) lives here. `evaluateGuess`/`percentOff`/`revealedCount` (`src/game/logic.ts`) are pure helpers, as are price parsing/formatting (`src/game/format.ts`) and the share text/clipboard logic (`src/game/share.ts`). Progress persists to `localStorage` **per slug** (`src/game/storage.ts`, key prefix `gth:v1:`), so each house keeps its own saved result and switching houses starts fresh. The number of revealed photos/facts is derived from the count of *wrong* guesses, not total guesses. End-of-game flair also lives here: a two-sided confetti burst on a win (plus an extra center burst on an *exact* guess, and a 2s-delayed lightening of the unused try buttons), and a short gravity-driven 👎 emoji rain on a loss.

- **Analytics (`src/analytics.ts`)** — Fire-and-forget POSTs to a Google Apps Script web app that appends rows to a Google Sheet (tabs: `Sessions` one per page load, `Guesses` one per guess, `Results` one per finished game). Every call must swallow errors and never block or break gameplay. The POST uses `Content-Type: text/plain` deliberately — it keeps the request "simple" so there's no CORS preflight (which Apps Script can't answer); don't change it to `application/json`. The `Results` row is buffered in a ref and flushed exactly once (on share, `pagehide`/`visibilitychange`, or unmount) so the `shared` flag can be recorded without duplicate rows. Geo comes from ip-api.com's free endpoint, which is **HTTP-only** — on the deployed HTTPS site it's blocked as mixed content, so ip/country/city are empty in prod (works on local dev). The endpoint URL can be overridden via `VITE_ANALYTICS_URL`.

- **Components (`src/components/`)** — Presentational: `ImageViewer`, `FactsList`, `TriesRow` (clickable revealed tries to review past photos), `GuessInput`, `GuessList`, `Result` (win/lose screen + share), `NewGameTimer` (countdown to reset), `MapView` (Leaflet/OpenStreetMap, centered on coordinates with **no marker** so the area stays a hint), `Header`.

## Key invariants when editing

- Provide **6 images and 6 facts** per property (`MAX_TRIES`). Facts reveal one-per-wrong-guess in array order; the *last* facts/photos are the most revealing.
- `soldPrice` is the answer and is never placed in `facts` — it's only shown on the end screen. The share text likewise reveals the closest guess's % off but never a euro amount.
- To schedule a house for a date, the folder name **must** be `DD_MM_YY` (e.g. `08_06_26`). Non-date folder names (e.g. a demo property) are only reachable via `OVERRIDE_SLUG`.

## Deploy

`render.yaml` configures a Render Static Site: build `npm install && npm run build`, publish `dist`, with a `/*` → `/index.html` rewrite.
