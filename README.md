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
   - ⬆️ the price is **higher** than your guess (⬆️⬆️ if you're more than 50% under)
   - ⬇️ the price is **lower** than your guess (⬇️⬇️ if you're more than 50% over)
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

### Adding a house (just create a folder)

No code changes, no registration. Create one folder under `src/properties/`:

```
src/properties/08_06_26/
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
