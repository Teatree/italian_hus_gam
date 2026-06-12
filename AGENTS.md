# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

> This file is a verbatim mirror of `CLAUDE.md` — keep both in sync when editing.

## Commands

```bash
npm install
npm run dev          # Vite dev server at http://localhost:5173
npm run build        # tsc --noEmit type-check, then vite build -> ./dist
npm run preview      # serve the production ./dist build locally
npm run images:webp  # convert property photo-*.png to .webp in place (sharp; --keep, --dry-run)
```

There is no test suite, linter, or formatter configured. `npm run build` (which runs `tsc --noEmit`) is the only automated check — run it to verify type-correctness after changes.

## Architecture

A fully static Vite + React + TypeScript daily-puzzle game (no backend of our own). Players guess an Italian house's sale price in up to `MAX_TRIES` (6) guesses; each wrong guess reveals one more photo and one more fact. A guess wins if it's within the **win margin**: ±`TOLERANCE` (10%) of the price, **capped at `TOLERANCE_CAP` (€200k)** so expensive houses don't get an absurdly wide window. Wrong guesses get a directional arrow, doubled ("way off") past `FAR_THRESHOLD` (30%) capped at `FAR_THRESHOLD_CAP` (€200k). All of these knobs live in `src/admin.ts`; the pure comparison logic is `evaluateGuess` in `src/game/logic.ts`.

The data flow is **content folders → build-time auto-discovery → date-based scheduling → single-game React tree**:

- **Content as folders (`src/properties/<DD_MM_YY>/`)** — Each puzzle is a folder containing `config.json` (`coordinates`, `mapZoom`, `soldPrice`, `propertyUrl`, `facts[]`) plus `photo-*.webp` images (the discovery glob also accepts `png/jpg/jpeg/avif`). Adding a puzzle means creating a folder; there is **no registration step and no code change**. The folder name is the slug. Drop raw `photo-*.png` files and run `npm run images:webp` to convert/downscale them.

- **Auto-discovery (`src/properties/index.ts`)** — Uses Vite's `import.meta.glob` (eager) to collect all `config.json` files and all images at build time into a `properties` registry keyed by slug. Images are sorted by filename (numeric-aware), so `photo-1 … photo-6` order matters. The folder name slug doubling as a `DD_MM_YY` date is what links content to the schedule.

- **Scheduling (`src/game/schedule.ts` + `src/admin.ts`)** — `getScheduleInfo()` computes the current puzzle's `dateKey` (as `DD_MM_YY`) and the `nextResetMs` boundary. A "puzzle day" runs from `RESET_HOUR` (10:00) in `RESET_TIME_ZONE` (`Europe/Kyiv`, DST-aware) until the same time next day. The zone math is done manually via `Intl.DateTimeFormat` to handle DST correctly — do not replace it with naive `Date` offset arithmetic. `OVERRIDE_SLUG` in `admin.ts` forces a specific property regardless of date (testing only).

- **App shell (`src/App.tsx`)** — Resolves `slug = OVERRIDE_SLUG ?? dateKey`, looks it up in `properties`. No match → `ComeBackScreen` with countdown. A 1s interval reloads the page when `nextResetMs` passes so a new puzzle loads cleanly. The `<Game>` component is keyed by `property.slug` so changing the active property forces a clean remount with fresh state.

- **Game state (`<Game>` in `App.tsx`)** — All gameplay state (`guesses`, `status`, `selectedImage`) lives here. `evaluateGuess`/`percentOff`/`revealedCount` (`src/game/logic.ts`) are pure helpers, as are price parsing/formatting (`src/game/format.ts`) and the share text/clipboard logic (`src/game/share.ts`). Progress persists to `localStorage` **per slug** (`src/game/storage.ts`, key prefix `gth:v1:`), so each house keeps its own saved result and switching houses starts fresh. The number of revealed photos/facts is derived from the count of *wrong* guesses, not total guesses. End-of-game flair also lives here: confetti on a win, 👎 rain on a loss, and a celebration video (`WinVideoModal`) that plays 3s after a **fresh** win only — never on a loss or a restored saved win — with the Share button held back until the video fires.

- **Analytics (`src/analytics.ts`)** — Fire-and-forget POSTs to a Google Apps Script web app that appends rows to a Google Sheet (tabs: `Sessions` one per page load, `Guesses` one per guess, `Results` one per finished game). Every call must swallow errors and never block or break gameplay. The POST uses `Content-Type: text/plain` deliberately — it keeps the request "simple" so there's no CORS preflight (which Apps Script can't answer); don't change it to `application/json`. The `Results` row is buffered in a ref and flushed exactly once (on share, `pagehide`/`visibilitychange`, or unmount) so the `shared` flag can be recorded without duplicate rows. Geo comes from ip-api.com's free endpoint, which is **HTTP-only** — on the deployed HTTPS site it's blocked as mixed content, so ip/country/city are empty in prod (works on local dev). The endpoint URL can be overridden via `VITE_ANALYTICS_URL`.

- **Components (`src/components/`)** — Presentational: `ImageViewer`, `FactsList`, `TriesRow` (clickable revealed tries to review past photos), `GuessInput`, `GuessList`, `Result` (win/lose screen + share), `WinVideoModal`, `NewGameTimer` (countdown to reset), `MapView` (Leaflet/OpenStreetMap, centered on coordinates with **no marker** so the area stays a hint), `Header`.

## Key invariants when editing

- Provide **6 images and 6 facts** per property (`MAX_TRIES`). Facts reveal one-per-wrong-guess in array order; the *last* facts/photos are the most revealing.
- `soldPrice` is the answer and is never placed in `facts` — it's only shown on the end screen. The share text likewise reveals the closest guess's % off but never a euro amount.
- To schedule a house for a date, the folder name **must** be `DD_MM_YY` (e.g. `08_06_26`). Non-date folder names (e.g. a demo property) are only reachable via `OVERRIDE_SLUG`.

## Deploy

`render.yaml` configures a Render Static Site: build `npm install && npm run build`, publish `dist`, with a `/*` → `/index.html` rewrite.
