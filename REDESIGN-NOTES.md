# Guess My Casa — redesign notes

Working notes for implementing the handoff package `guess-my-casa-handoff.zip` (v2, 5 Nov 2026) in
this codebase. Branch: `redesign/guess-my-casa`.

- **Section 1** was written in Phase 0, before any code changed: what exists today and where.
- **Sections 2–5** were filled in as the work went: the mapping as built, deviations, the
  acceptance checklist, and what is left for the owner.

---

## 1. Phase 0 — the codebase before the redesign

### 1.1 Baseline health (6 Nov 2026, `main` @ `4d66007`)

| Check | Result |
|---|---|
| `npm run build` (`tsc --noEmit` + `vite build`) | Passes. |
| Lint / tests | None configured (the build is the only automated check). |
| Existing warning | Vite's "chunk larger than 500 kB" warning for the single JS bundle (522 kB). Not touched. |
| Content | 153 houses. 2 of them carry **7** facts (`27_06_26`, `10_07_26`); every house has 6 photos. Several late-October/July folders still ship raw multi-MB PNGs. Not touched. |
| Halloween | Dormant: `isHalloween()` requires the live puzzle day to be ≤ `31_10_26`, so it is off everywhere today, including past-day links. |

### 1.2 Where things live

| Concern | File | Notes |
|---|---|---|
| Rules: ±10% win, >30% double arrow | `src/game/logic.ts` (`evaluateGuess`, `percentOff`, `revealedCount`) + knobs in `src/admin.ts` (`MAX_TRIES`, `TOLERANCE`, `FAR_THRESHOLD`) | Win is **inclusive** (`<= 10%`), double arrow is **exclusive** (`> 30%`). Reused untouched. |
| Price parsing / formatting | `src/game/format.ts` | `formatEuro`, `parsePrice`, `formatPriceInput`. |
| Storage | `src/game/storage.ts` | One JSON blob per house. |
| Share text + clipboard | `src/game/share.ts` (`buildShareText`, `copyToClipboard`) | Title comes from `APP_TITLE` in `admin.ts`. |
| Day links (`?day=`) | `src/game/dayLink.ts` | `dayUrl`, `todayUrl`, `resolvePastDay`. |
| Schedule, reset, countdown target | `src/game/schedule.ts` (`getScheduleInfo`) | 10:00 `Europe/Kyiv`, DST-aware. The 1 s reload interval is in `App.tsx`. |
| Analytics | `src/analytics.ts` (`track`, `loadGeo`) called from `App.tsx` | Tabs `Sessions`, `Guesses`, `Results`. The `Results` row is buffered and flushed once (share / pagehide / unmount). |
| Seasonal theme | `src/theme/halloween.tsx` + `src/index.css` + window in `admin.ts` | `<html data-theme="halloween">`, context hook `useHalloween()`. |
| Disguised-country config | `config.json` → `titleIcon`, `titleIconUrl`, `shareFlag` (defaults in `admin.ts`) | 144 Italy, 4 Finland, 4 Spain, 1 Greece. One house (`14_10_26`) has the Finland icon with the default 🇮🇪 flag. |
| Verdict question | `config.json` → `priceVerdict` (105 of 153) | Popup in `src/components/VerdictPopup.tsx`. |
| Leaflet | `src/components/MapView.tsx` | `react-leaflet`, default blue pin, `scrollWheelZoom` on. |
| Content discovery | `src/properties/index.ts` | `import.meta.glob`; slug = folder name. |
| Page meta | `index.html` | Title, description, `og:` / `twitter:` tags. |

### 1.3 `localStorage` keys

| Key | Value | Status |
|---|---|---|
| `gth:v1:<slug>` | `{ slug, guesses: [{ value, direction }], status, verdict? }` | **Kept as is.** Nothing added, nothing renamed. |
| `gth:analytics:seen` | `'1'` | Kept. |
| `gmc-theme` | `'dark'` \| `'light'` | **New** (the only new key). |

### 1.4 Analytics calls before the redesign

| When | Call |
|---|---|
| Page load, after the geo lookup | `track('Sessions', { puzzleDate, city, isReturning, referrer, userAgent, device, language, screenW })` |
| Every accepted guess | `track('Guesses', { gameId, puzzleDate, tryNumber, guessValue, direction, percentOff, euroOff, timeOnTryMs, soldPrice, win_status })` |
| Game finished — flushed once on share, `pagehide`, hidden tab or unmount | `track('Results', { gameId, puzzleDate, outcome, triesUsed, exact, closestPercentOff, closestEuroOff, totalTimeMs, shared, verdict })` |
