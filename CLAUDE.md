# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install
npm run dev      # Vite dev server at http://localhost:5173
npm run build    # tsc --noEmit type-check, then vite build -> ./dist
npm run preview  # serve the production ./dist build locally
```

There is no test suite, linter, or formatter configured. `npm run build` (which runs `tsc --noEmit`) is the only automated check — run it to verify type-correctness after changes.

## Architecture

A fully static Vite + React + TypeScript daily-puzzle game (no backend). Players guess an Italian house's sale price within `TOLERANCE` (±10%) in up to `MAX_TRIES` (6) guesses; each wrong guess reveals one more photo and one more fact.

The data flow is **content folders → build-time auto-discovery → date-based scheduling → single-game React tree**:

- **Content as folders (`src/properties/<DD_MM_YY>/`)** — Each puzzle is a folder containing `config.json` (`coordinates`, `mapZoom`, `soldPrice`, `propertyUrl`, `facts[]`) plus `photo-*.png` images. Adding a puzzle means creating a folder; there is **no registration step and no code change**. The folder name is the slug.

- **Auto-discovery (`src/properties/index.ts`)** — Uses Vite's `import.meta.glob` (eager) to collect all `config.json` files and all images at build time into a `properties` registry keyed by slug. Images are sorted by filename (numeric-aware), so `photo-1 … photo-6` order matters. The folder name slug doubling as a `DD_MM_YY` date is what links content to the schedule.

- **Scheduling (`src/game/schedule.ts` + `src/admin.ts`)** — `getScheduleInfo()` computes the current puzzle's `dateKey` (as `DD_MM_YY`) and the `nextResetMs` boundary. A "puzzle day" runs from `RESET_HOUR` (10:00) in `RESET_TIME_ZONE` (`Europe/Kyiv`, DST-aware) until the same time next day. The zone math is done manually via `Intl.DateTimeFormat` to handle DST correctly — do not replace it with naive `Date` offset arithmetic. `OVERRIDE_SLUG` in `admin.ts` forces a specific property regardless of date (testing only).

- **App shell (`src/App.tsx`)** — Resolves `slug = OVERRIDE_SLUG ?? dateKey`, looks it up in `properties`. No match → `ComeBackScreen` with countdown. A 1s interval reloads the page when `nextResetMs` passes so a new puzzle loads cleanly. The `<Game>` component is keyed by `property.slug` so changing the active property forces a clean remount with fresh state.

- **Game state (`<Game>` in `App.tsx`)** — All gameplay state (`guesses`, `status`, `selectedImage`) lives here. `evaluateGuess`/`percentOff`/`revealedCount` (`src/game/logic.ts`) are pure helpers. Progress persists to `localStorage` **per slug** (`src/game/storage.ts`, key prefix `gth:v1:`), so each house keeps its own saved result and switching houses starts fresh. The number of revealed photos/facts is derived from the count of *wrong* guesses, not total guesses.

- **Components (`src/components/`)** — Presentational: `ImageViewer`, `FactsList`, `TriesRow` (clickable revealed tries to review past photos), `GuessInput`, `GuessList`, `Result` (win/lose screen + share), `NewGameTimer` (countdown to reset), `MapView` (Leaflet/OpenStreetMap, centered on coordinates with **no marker** so the area stays a hint), `Header`.

## Key invariants when editing

- Provide **6 images and 6 facts** per property (`MAX_TRIES`). Facts reveal one-per-wrong-guess in array order; the *last* facts/photos are the most revealing.
- `soldPrice` is the answer and is never placed in `facts` — it's only shown on the end screen.
- To schedule a house for a date, the folder name **must** be `DD_MM_YY` (e.g. `08_06_26`). Non-date folder names (e.g. a demo property) are only reachable via `OVERRIDE_SLUG`.

## Deploy

`render.yaml` configures a Render Static Site: build `npm install && npm run build`, publish `dist`, with a `/*` → `/index.html` rewrite.
