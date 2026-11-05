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

---

## 2. Old → new, as built

| Before | Now | Where |
|---|---|---|
| `App.tsx` (shell + `<Game>` in one file) | `App.tsx` is the page shell; the game moved to `Game.tsx` | `src/App.tsx`, `src/Game.tsx` |
| `Header` (title + title-icon link) | Awning, title, theme toggle, "?" button, flag chip (the bonus link) + countdown | `components/Header.tsx`, `components/Countdown.tsx` |
| `NewGameTimer` under the tries | Countdown in the header's meta row, again on the result card, and on the empty-day card | `components/Countdown.tsx` |
| `ImageViewer` + `n / 6` badge | `Photo`: clue pill above a 4:3 frame, two-layer crossfade, expand button, carousel arrows, "Back to try N →" chip | `components/Photo.tsx`, `components/CluePill.tsx` |
| `Lightbox` | `Zoom`: FLIP open/close, clue pill, dots, caption; arrows, swipe and ←/→ after the game | `components/Zoom.tsx` |
| `FactsList` (hints list / desktop side column) | Removed. The clue pill shows the current clue; `CluesPanel` holds all six behind shutters | `components/CluesPanel.tsx` |
| `TriesRow` (24px numbered buttons) | `TryCircles`: 46px circles with the arrow or check inside and the value below | `components/TryCircles.tsx` |
| `GuessList` | Removed. The circles are the guess history, and they stay after the game ends | — |
| `GuessInput` (input + Submit) | `GuessForm`: one 60px pill with the Guess button inside, helper line, typo/repeat feedback | `components/GuessForm.tsx` |
| `Result` | `ResultCard`: title, ASKING PRICE, counting price, summary, Share result, View listing ↗, next-casa countdown | `components/ResultCard.tsx` |
| `VerdictPopup` (centred modal, Tassos, emoji cards) | `VerdictSheet` bottom sheet with three line-icon tiles; plus `HelpSheet` and `CopySheet` | `components/Sheet.tsx`, `components/Sheets.tsx` |
| "Copied" on the button | Button turns green + `Toast`; `CopySheet` if the copy is refused | `components/Toast.tsx` |
| `PastDayBanner` (amber, container width) | Edge-to-edge sticky banner in the accent colour; the meta row shows the date | `components/PastDayBanner.tsx` |
| `ComeBackScreen` | `NoCasa` card | `components/NoCasa.tsx` |
| `MapView` (240px, blue pin, wheel zoom on) | 180px, accent pin, tile-only dark filter, wheel zoom after a click | `components/MapView.tsx` |
| `theme/halloween.tsx` (`data-theme="halloween"`) | `theme/season.tsx` (data-driven seasons, `data-season`); Halloween's own pieces stay in `halloween.tsx` | `src/theme/` |
| — | Dark/light, countries | `theme/theme.ts`, `theme/country.ts` |
| — | Confetti and loss rain | `src/fx/celebrate.ts` |
| — | Reduced-motion checks, scroll lock, focus trap, focus return | `src/lib/motion.ts` |
| Five CSS variables + Tailwind utilities | `styles/tokens.css` (from the handoff, unchanged) + `styles/app.css` (ported from the prototype); Tailwind's theme mapped onto the tokens | `src/styles/`, `tailwind.config.js` |
| — | Ad slots behind `ADS_ENABLED` | `components/Ads.tsx`, `src/admin.ts` |

**Untouched:** `src/game/logic.ts`, `src/game/storage.ts`, `src/game/share.ts`, `src/game/dayLink.ts`,
`src/analytics.ts`, every `config.json`, the authoring scripts (one comment aside).
`src/game/schedule.ts` only gained two date helpers (and lost the long date format, which nothing
used any more); `src/game/format.ts` gained the short "650k" format and the field's digit helpers.

---

## 3. Decisions and deviations from the handoff

Where the spec and the codebase (or good sense) pulled apart. Each one is small; none changes a rule.

| # | The spec says | What was built | Why |
|---|---|---|---|
| 1 | A season follows the house's date on a past-day link (P10) | Kept today's rule exactly: the house's date must be in the window **and** the live day must not be past the season's last day | The owner's hard rule from October: Halloween is gone from the 1 Nov reset "no matter what". The spec itself says "the same rule as today" |
| 2 | Chip `aria-label="Bonus link"` | `"Casa Nº 147 · Italia. Bonus link"` | A label that replaces the visible text hides the house number and country from screen readers |
| 3 | `og:title` / `twitter:title` = "Guess My Casa" | "Guess My Casa 🇮🇪" | Only the name was replaced; the flag in the preview title is part of the 🇮🇪 joke the brief says to keep |
| 4 | Sheets focus their first button on open | True for how-to-play and copy-fallback; the **verdict** sheet focuses the sheet itself | Otherwise "Steal" opens wearing a focus ring (always in Safari, and for keyboard users everywhere) and looks pre-selected |
| 5 | Copy to the clipboard 740ms after a vote | The text is written **inside the tap**; "Copied!" and the toast appear at ~740ms, as specified | Browsers that require a user gesture for the clipboard would refuse a write 740ms later |
| 6 | Save a `celebrated` flag so celebrations don't replay (P2) | No flag. Celebrations are fired by the guess that ends the game, never by a render | A restored game can't celebrate by construction, and the save format stays exactly what it was |
| 7 | Zoom FLIP animates `transform` only | `transform` + `clip-path` | The page crops photos to 4:3, the zoom shows them whole, and listing photos are 3:2 — a transform alone starts about 11% off for almost every real photo |
| 8 | Zoom caption during play: "… more unlock with each miss" | Dropped on the last try, when all six are already unlocked | It would no longer be true |
| 9 | Helper line 13px | 12px at ≤360px wide | At 320px the rules reminder wrapped to two lines, so the page below the field moved whenever the helper changed |
| 10 | Optional new analytics events (`theme_toggle`, …) | Not added | `track()` writes to three named sheet tabs; a new event needs a new tab and an Apps Script change, which isn't "trivial" |
| 11 | Collapse an ad slot when the network reports no fill | Not built; noted in `Ads.tsx` | There is no ad script yet. `ADS_ENABLED` is `false`, so nothing renders and nothing is reserved |
| 12 | Verdict sheet (thumbnail, no links) | As specified — so two things the old popup had are gone: tapping its photo to zoom, and the "this property" link | The redesign replaced them; the listing link is on the result card right behind the sheet |
| 13 | Tombstone tries at Halloween: optional | Circles | The spec's default |
| 14 | — | The house number is the house's position among date-named folders (1 Nov = Nº 147; the mock's "153" was the total at the time) | Derivable with no authoring. Filling an earlier empty date renumbers later houses |
| 15 | No bonus link → chip is plain text (C8) | `titleIconUrl: ""` means "none"; an omitted field still falls back to the default link | Omitted has always meant "use the default" |
| 16 | 6 clues | Two configs carry 7 facts (`27_06_26`, `10_07_26`); the 7th is no longer shown | The panel has six tiles. Before, the 7th appeared in the list once the game ended |
| 17 | Map attribution caption | Caption with a link to the OSM copyright page; Leaflet's own attribution box is hidden | One credit, in the design's place, still linked as the licence asks |
| 18 | Past-day pages hide the countdown | Also hidden on the result card there | Same reason as in the header: it is about today's house |

Also changed without the spec asking: the favicon uses the new palette; `public/*_icon.png` and
`Tassos_speaks.png` are no longer displayed (files kept — the icon filenames still name the country).

---

## 4. Acceptance checklist

How each line was checked. "Scripted" = Playwright assertions against the running app with the clock
faked to the relevant date, in system Chrome and again in WebKit 26.5.

### Must not break
- [x] Share text has no "€" and none of the price's digits — scripted for win, exact and loss (clipboard read back and compared to the exact expected text).
- [x] Verdict wrapped in `||…||`; houses without the question copy straight away — scripted (`03_06_26`).
- [x] Price not in the DOM, aria-labels, titles or the count-up before the end — scripted: the whole document is searched for the price at the start, mid-game, and on the last try. The count-up starts at €0.
- [x] One photo and one hint per wrong guess; thresholds and arrows unchanged — scripted, including the edges (exactly 10% off wins; exactly 30% off is a single arrow; one euro past is a double). `logic.ts` is untouched.
- [x] A save from before the deploy loads mid-game and finished — scripted with saves in the old format (it is also the current format), including a legacy `verdict: "skipped"`.
- [x] `?day=` links: right house, separate save, banner, no countdown — scripted; today/future/invalid dates fall back to today and the param is stripped.
- [x] 10:00 Europe/Kyiv reset still reloads — scripted across the boundary (Nº 147 → Nº 148). Countdown identical in New York and Tokyo.
- [x] Disguised houses: flag, name, word, accent — scripted for Spain, Greece, Finland (incl. `14_10_26`, Finland icon with the default flag); Portugal and France via a swapped config.
- [x] Halloween: tokens, effects, themed sheets — scripted at a faked 29 Oct, and screenshots reviewed; off again on a 29 Oct link opened after 1 Nov.
- [x] Every analytics event still fires — scripted against a production build with the endpoint intercepted: same three tabs, same field lists, one `Results` row per game, nothing sent for a rejected guess.
- [x] Jokes intact.
- [x] Overlays above the map — scripted (`elementFromPoint` over the map with the zoom and a sheet open).

### Layout and visuals
- [x] Screens match the reference — 31 reference screenshots were paired with a capture of the app in the same state. 29 pairs were inspected by eye, and every full-page pair has the identical pixel height.
- [x] Awning full-bleed at 320 / 390 / 1280 / 1920.
- [x] Clue pill position, shape, surface, magnifier, 2-line clamp; photo shifted 6px and still 4:3.
- [x] Magnifier in the Clues bar and on unlocked tiles; expand icon on the zoom button.
- [x] A new hint moves nothing below the photo — scripted: page height identical before/after a wrong guess, panel open and closed.
- [x] Input position the same on try 1 and try 6 — scripted.
- [x] Arrows inside the circles, values below, history kept after the game.
- [x] Clues panel collapsed by default, mouse and keyboard, six 78px tiles, shutters.
- [x] Result card for win, exact and loss.
- [x] Dark by default even with OS light mode; light persists; no flash — scripted (the inline script alone sets the theme with the app bundle blocked).
- [x] Country accents and shutters, dark and light.
- [x] 320px: one-line header, six circles, verdict labels on one line.
- [x] Desktop: 440px column, sheets 440px.
- [x] Ad slots reserve space; with ads off no boxes and no padding — scripted both ways.
- [x] Map: tile-only filter, accent pin follows theme, wheel doesn't hijack scrolling — scripted.

### Motion
- [x] Wrong guess, invalid input, panel, review, last try, win, exact, loss, share → verdict → copied, sheets, zoom, theme toggle — each recorded as a filmstrip and compared with the handoff's.
- [x] No animation on first paint or restore; celebrations never replay — scripted.
- [x] Reduced motion — scripted (no confetti canvas, no rain, no count-up, no autoplay, instant clue swap, no FLIP).
- [ ] **No dropped frames at 4× CPU throttle — not measured.** Only transform, opacity and colours animate, with three exceptions: the Clues panel's `grid-template-rows` and the "now" circle's glow (both from the spec), and the zoom's `clip-path` (deviation 7).

### Edge cases (spec/06)
- [x] C1–C12 — scripted with configs and photos swapped on the wire. C3 is a design property (the pill sits on the photo's edge). C11 shows as "Casa · Italia".
- [x] I1–I13 — scripted, except I12/I13 which need a real phone keyboard (the field is 20px, focus is kept between guesses and dropped at the end).
- [x] P1–P10 — scripted. P10 per deviation 1.
- [x] S1–S6 — scripted.
- [x] L1–L9 — scripted or screenshot-reviewed (320, 240, landscape, 1920). L4 safe areas are in the CSS but need a notched device to see.
- [x] M1–M4. M4 (tile failure) by inspection: the frame's background is `--raised`.
- [x] A1–A6 — A6 rendered under forced-colors emulation.

### Accessibility
- [x] Every target ≥ 44×44 — scripted at 390 and 320 (the chip's hit area is extended to 44px; Leaflet's zoom buttons are 36px, as the spec sets them).
- [x] Focus visible, trapped in dialogs, returned on close — scripted.
- [x] Guess feedback, result and toast are announced (live regions present and populated — not listened to with a real screen reader).
- [x] Lighthouse accessibility (mobile): **100** playing, **100** finished with the Clues panel open.

### Engineering
- [x] `npm run build` passes; no console errors or warnings in the scripted runs. (No lint or tests exist.)
- [x] No new runtime dependencies — only the three font files.
- [x] Timers, intervals and listeners cleaned up; countdowns pause while the tab is hidden.
- [x] This file.

Scripted totals on the final code: Chrome 222 of 222 assertions; WebKit 220 of 222 — the two misses
are the test's, not the app's (a 120ms check that the driver reached late, and WebKit reporting a
scroll height without the bottom padding).

---

## 5. For the owner

**Check these yourself — they could not be verified from here**

1. **A real iPhone / Safari.** WebKit was tested through Playwright's Windows build, which cannot
   render variable fonts, so font weights looked wrong there and were not judged. Behaviour passed.
   Firefox was not tested (no matching Playwright build installed).
2. **Font preloading on the live host.** In WebKit the two preloaded fonts were fetched twice and the
   console warned "preloaded but not used". The cause was the local servers sending `Vary: Origin`.
   If Safari shows the same warning on the live site, the host sends that header too.
3. **Frame rate on a mid-range phone** (see the unticked line above).

**Decisions that are yours to reverse**

- The house number (Nº 147 on 1 Nov) and what back-filling a date does to it.
- The 🇮🇪 kept in the link-preview title.
- Deviations 4, 7, 9 and 16 in section 3.

**Housekeeping**

- Nothing was pushed and `main` is untouched: the work is on the branch `redesign/guess-my-casa`.
- `guess-my-casa-handoff.zip`, `design-handoff.zip` and `design-handoff/` are untracked and were left alone.
- Next Halloween means bumping the two dates in `src/admin.ts`, as before.
