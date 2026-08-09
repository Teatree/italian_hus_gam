# Guess The House 🇮🇹

A daily-puzzle-style game (inspired by [guessthe.house](https://guessthe.house)) for Italian
houses. Players see a house's photos plus progressively revealed facts and a rough-area map,
and try to guess its sale price within **10%** in up to **6 tries**.

Built with **Vite + React + TypeScript**, **Leaflet/OpenStreetMap** for the map, and
**Tailwind CSS**. It's a fully static site — no backend.

## Develop

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + produce ./dist
npm run preview  # serve the production build locally
```

## How to play

1. Enter a price and press **Submit**.
2. A wrong guess reveals the next photo and a new fact, highlights the next try button, and
   adds the guess to the list with an arrow that points toward the real price:
   - ⬆️ the price is **higher** than your guess (⬆️⬆️ if you're more than 30% under)
   - ⬇️ the price is **lower** than your guess (⬇️⬇️ if you're more than 30% over)
3. Guess within 10% to win (**Good Job!**). Run out of tries and you lose (**You Suck!**).
4. The real sale price is revealed at the end, plus a **Share** button that copies an emoji
   grid + link to your clipboard.

You can click any **revealed** try button to look back at that try's photo; upcoming
(grayed-out) tries are locked.

Progress is saved in the browser (`localStorage`) **per house**, so returning players resume
where they left off, and switching the active house starts a fresh game.

## Daily rotation & scheduling

The puzzle rotates automatically every day at **10:00 Eastern European time** (`Europe/Kyiv`,
daylight-saving aware). The property shown is the one whose **folder name matches the current
date** in `DD_MM_YY` format (e.g. on 8 June 2026 it shows `08_06_26`). A folder is the active
puzzle from 10:00 on its date until 10:00 the next day. If no folder matches the current day, a
"check back soon" screen shows with a countdown. When the reset passes while someone is playing,
the page auto-refreshes to load the new puzzle.

### Testing a specific date

To play a scheduled house today (e.g. to preview `27_07_26` before it goes live):

1. Open `src/admin.ts`.
2. Set `OVERRIDE_SLUG` to the property's folder name:
   ```ts
   export const OVERRIDE_SLUG: string | null = '27_07_26';
   ```
3. Run `npm run dev` and open http://localhost:5173 — that house now loads regardless of
   the real date.
4. To replay it from scratch, clear the saved progress: DevTools → **Application → Local
   Storage → http://localhost:5173** → delete the `gth:v1:27_07_26` key (or run
   `localStorage.clear()` in the console) and refresh.
5. When you're done, set `OVERRIDE_SLUG` back to `null` — **don't commit the override**, or
   the deployed site would be stuck on that one house.

### Adding a house (just create a folder)

No code changes, no registration. Create one folder under `src/properties/`, inside the
matching month folder (the `YYYY_MM` folder is just so months sort chronologically in a file
explorer — only the property's own folder name matters to the app):

```
src/properties/2026_06/08_06_26/
├─ config.json          # all parameters/hints (see below)
├─ photo-1.png          # images, shown in filename order (.jpg/.webp/.avif also work)
├─ photo-2.png
└─ … photo-6.png
```

`config.json`:

```json
{
  "coordinates": [44.0099, 12.5975],
  "mapZoom": 12,
  "soldPrice": 1200000,
  "propertyUrl": "https://www.idealista.it/en/immobile/35770070/",
  "prop_pictures": { "1": 12, "2": 7, "3": 1, "4": 4, "5": 20, "6": 9 },
  "titleIcon": "italy_icon.png",
  "titleIconUrl": "https://youtu.be/IGBEp1zTbUw",
  "shareFlag": "🇮🇪",
  "facts": [
    "Located near Montescudo, Rimini",
    "270 m² of living space",
    "9 rooms / 5 baths",
    "Built in 2001",
    "Land plot of 2,700 m²",
    "Listed as \"Urgent\""
  ]
}
```

The folder name becomes the slug/date. Facts reveal one-by-one (one per wrong guess); provide 6
images and 6 facts. Folders are auto-discovered at build time via `import.meta.glob`.

#### Autofilling the config (idealista only)

Once `config.json` has a `propertyUrl`, you can have most of the rest filled in for you. **Double-click
`1_autofill.bat`** in the folder (or run `node scripts/autofill-config.mjs src/properties/<YYYY_MM>/<date>`).
Both this and the photo fetcher first check that no other property already uses the same listing URL —
if one does, they stop with a warning naming the folder, so you can't accidentally schedule the same
house twice. It reads the listing and writes:

- `coordinates` — the listing's map location.
- `soldPrice` — the listing price.
- a **draft `facts` list** following the usual wording, filling what it finds and leaving blanks for the
  rest: `Located in …`, `N m² of living space`, `N rooms N baths`, `Built in N`, `N floors`,
  `Land plot of N m²`, and `Private Garden` / `Swimming Pool` if present — plus one **measured** fact:
  the free-flow car time to the best nearby city (e.g. `1h 20m to Venice by Car`), computed from the
  coordinates via the free OSRM routing server. If the property is already in/near that city (under
  20 minutes' drive), or nothing is within 150 minutes by road, this fact is never added.

  The city is **scored, not just the nearest one** — see
  [How the drive-time city is chosen](#how-the-drive-time-city-is-chosen) below for the exact formula.

It always writes exactly **6 facts**, in **randomized order**: the first is always the location fact; the
other 5 slots go to the priority facts (living space, built-in year, drive time) whenever available plus
a random draw of the remaining ones, shuffled. Anything it couldn't find (or padding to reach 6) is
written as `<INSERT HINT HERE>` so you can search for and fill the gaps, and facts that lose the random
draw are printed in the console so you can swap them in. Everything else (`propertyUrl`,
`prop_pictures`, the title-icon/flag fields) is preserved. Treat the facts as a **draft** — replace the
placeholders and add your own flavour. Same visible-Chrome / one-time-slider flow as photo fetching below
(idealista only).

#### How the drive-time city is chosen

All of this lives in `scripts/drive-time.mjs`; every constant below is a named export-adjacent
`const` at the top of that file, so tuning means editing one number.

The problem with picking the *nearest city above a population threshold*: for a property near
Corigliano-Rossano it chose **Lamezia Terme** (70,501 people, 1h 55m away) over **Cosenza**
(63,852, 66 min) purely because Cosenza fell 6,149 people under a 70,000 cut — even though Cosenza
is the *provincial capital* and Lamezia Terme is not. Lowering the threshold alone doesn't fix that;
it just lets villages win. So the threshold became a candidate **net**, and a score picks the winner.

**Step 1 — candidate pool.** Every place in `scripts/big-cities.mjs`: GeoNames `cities15000` rows in
Italy, Spain or Finland, feature class `P`, excluding `PPLX` and the hand-maintained
`EXCLUDE_DISTRICTS` list, with **population ≥ 20,000**. Currently 896 places (IT 436, ES 403, FI 57).
Each row carries `fcode` (administrative rank), `pop` and `coords`.

**Step 2 — shortlist** (`shortlistCandidates`), the union of two sets, deduped by name:

- the **nearest 8** by great-circle distance (`NEAREST_COUNT = 8`)
- the **nearest 4** places ranked `PPLC`/`PPLA`/`PPLA2` within **150 km** by air
  (`MAJOR_COUNT = 4`, `MAJOR_MAX_AIR_KM = 150`)

The second set is not optional. Around Taormina the eight closest places are all small
Catania-area towns, which crowded Messina out of the running entirely.

**Step 3 — route.** All ~12 shortlisted places go into **one** OSRM `table` request
(`sources=0&annotations=duration,distance`, car profile, free-flow). Nearest-by-air isn't
nearest-by-road anyway, and one request costs the same with 5 destinations or 12.

**Step 4 — filter.** Drop any candidate whose drive time isn't finite or exceeds
**`MAX_DRIVE_MINUTES = 150`**. This is also the nonsense guard: OSRM will happily "drive" from
Lampedusa to Gela in 2,761 minutes (46 hours) across open sea.

**Step 5 — score.** Lowest wins; ties fall back to shortlist position (nearest by air first).

```
score = driveMinutes − prominenceBonus(city)

prominenceBonus(city) = RANK_BONUS_MINUTES[city.fcode]
                      + max(0, SIZE_BONUS_PER_DECADE × log10(city.pop / SIZE_BONUS_FLOOR_POP))
```

Both terms are in **minutes**, and the bonus reads as *"how much extra driving this place's standing
is worth"*. `SIZE_BONUS_PER_DECADE = 15`, `SIZE_BONUS_FLOOR_POP = 20_000` — so ~10 min at 100k and
~25 min at 1M, log-scaled so a metropolis earns a detour without population alone dominating the way
the old rule did.

| `fcode` | Meaning | `RANK_BONUS_MINUTES` |
|---|---|---|
| `PPLC` | National capital | **+90** |
| `PPLA` | First-order (regional) capital | **+60** |
| `PPLA2` | Second-order (provincial) capital | **+35** |
| `PPLA3` / `PPLA4` | Third/fourth-order seat | **0** (the baseline) |
| `PPL` / `PPLL` | No administrative role — a *frazione* or suburb | **−25** |

The rank is a free, accurate stand-in for the amenities that make a place a good hint: in Italy a
provincial capital is where the hospital, courts, station and usually a university are. No amenities
dataset needed — GeoNames already ships the answer in a column we used to discard.

The **`PPL` penalty is load-bearing**, not decoration. Without it, *Rossano Stazione* — a frazione of
the property's own comune, 23,824 people, 26 min away — beat Cosenza by a single point.

**Step 6 — reject or format.** If the winner is under `IN_CITY_MINUTES = 20` away
(in `scripts/autofill-config.mjs`) the property counts as being *in* that city and **no drive fact is
written at all**. Otherwise `formatDriveTime` rounds to the nearest 5 minutes: `1h 5m to Cosenza by Car`.

**Worked example** — the property at `[39.6997146, 16.5038823]`:

| City | `fcode` | Pop | Drive | Rank | Size | Bonus | **Score** |
|---|---|---|---|---|---|---|---|
| **Cosenza** | `PPLA2` | 63,852 | 66m | +35 | +7.6 | 42.6 | **23.4** ← winner |
| Castrovillari | `PPLA3` | 20,334 | 45m | 0 | +0.1 | 0.1 | 44.7 |
| Rossano Stazione | `PPL` | 23,824 | 26m | −25 | +1.1 | −23.9 | 49.4 |
| Catanzaro | `PPLA` | 78,970 | 134m | +60 | +8.9 | 68.9 | 65.3 |
| Lamezia Terme | `PPLA3` | 70,501 | 117m | 0 | +8.2 | 8.2 | 109.1 |

(Drive times are rounded for display; scores are computed from the unrounded seconds OSRM returns,
so the columns won't subtract to the last decimal.)

Autofill prints the runner-up so you can see what the winner beat and override by hand:

```
✓ drive time   1h 5m to Cosenza by Car  (81 km by road; beat Castrovillari 45m)
```

Across the existing 68 properties this changes the chosen city for about 28 of them — mostly clear
wins (Sassari 1h 49m → **Olbia 25m**, Genoa 2h 1m → **Imperia 45m**, Cagliari 1h 32m →
**Carbonia 25m**). The judgement calls are all the regional-capital bonus pulling you further for a
more recognisable name (Ferrara 30m → Bologna 1h 5m, Ravenna 40m → Bologna 1h); lower `PPLA` from
60 to ~40 if you'd rather keep the closer, smaller city. Note that **existing `config.json` files are
not rewritten** — this only affects new autofill runs.

#### Pulling the photos automatically (idealista only)

Instead of screenshotting the listing photos by hand, you can have the photos downloaded for
you. Add a `prop_pictures` map to `config.json` that points each local photo slot at the
idealista **foto** number (the `…/foto/12/` number you see clicking through the gallery):

```json
"prop_pictures": { "1": 12, "2": 7, "3": 1, "4": 4, "5": 20, "6": 9 }
```

Then **double-click `2_run-fetch.bat`** inside the folder (or run
`node scripts/fetch-photos.mjs src/properties/<YYYY_MM>/<date>`). It opens Chrome, grabs each photo at full
resolution, and saves it as `photo-1.png … photo-6.png` (1537×1023), replacing any same-named
photo. Afterwards run `npm run images:webp` to convert them — the fetch step deliberately leaves
PNGs so the conversion stays a separate step.

> **idealista uses DataDome anti-bot protection**, so the Chrome window is **visible** and you
> may have to solve a one-time slider verification when it appears — solve it and the download
> continues on its own. The script paces its requests to avoid re-triggering it, and keeps a
> Chrome profile under `scripts/.pw-chrome-profile` (gitignored) so the "you're human" cookie
> persists between runs. This only works for idealista listings; other sites (e.g. etuovi.com)
> still need manual screenshots.

To covertly swap in a house from another country, set these **optional** per-date fields (each
falls back to the Italy default if omitted):

- `titleIcon` — filename of the icon shown next to the title. Drop the image in **`public/`**
  (e.g. `public/finland_icon.png`) and reference it by filename. Defaults to `italy_icon.png`.
- `titleIconUrl` — where that icon links. Defaults to the bundled bonus video.
- `shareFlag` — the flag emoji used in the share text (both flag spots). Pass any single unicode
  emoji, e.g. `"🇫🇮"`. Defaults to `"🇮🇪"`.

These defaults live in `src/admin.ts` (`DEFAULT_TITLE_ICON` / `DEFAULT_TITLE_ICON_URL` /
`DEFAULT_SHARE_FLAG`).

### The price-verdict popup (optional, per property)

Set `"priceVerdict": true` in a property's `config.json` and pressing Share on that house asks
*"What do you think of the price for this property?"* (the link goes to the listing) — 🤑 Steal /
🤝 Fair / 🚨 Rip-off — under the property's first photo, which zooms full-screen on click just
like on the game page (closing the zoom returns to the popup). A vote is appended to the share
text as a `🧾 My verdict: ||…||` line (an opinion only — never the euro amount — and the verdict
sits inside `||…||` Discord/Telegram spoiler marks so it doesn't hint at the price), remembered forever
for that house, and recorded in the `verdict` column of the analytics `Results` row (the Google
Apps Script needs that column added on the sheet side). The "skip →" link or clicking away
still copies the share text, just without a verdict — and isn't remembered, so the question
returns on every Share until the player votes. Omit the flag and nothing changes.

### Other admin settings (`src/admin.ts`)

- `APP_TITLE`, `MAX_TRIES`, `TOLERANCE`
- `RESET_HOUR` / `RESET_TIME_ZONE` — the daily reset time/zone
- `OVERRIDE_SLUG` — force a specific property regardless of date (testing only); leave `null`
  for normal date-based scheduling

The bundled `villa-chianti` folder is a non-dated demo property (only reachable via
`OVERRIDE_SLUG`, since its name never matches a date).

## Deploy to Render

This repo includes `render.yaml` for a **Static Site**. Either:

- **Blueprint:** push to a Git repo, then in Render choose *New → Blueprint* and pick the repo
  (Render reads `render.yaml`), **or**
- **Manual:** *New → Static Site*, set **Build Command** `npm install && npm run build` and
  **Publish Directory** `dist`, and add a rewrite rule `/*` → `/index.html`.

Share the resulting `*.onrender.com` URL.
