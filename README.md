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

## Admin: choosing / configuring the house

Everything is hardcoded in TypeScript — no admin UI.

- **`src/admin.ts`** — set `ACTIVE_SLUG` to the property you want to show right now. Also holds
  `APP_TITLE`, `MAX_TRIES`, and `TOLERANCE`.
- **`src/properties/<slug>.ts`** — per-house config: map `coordinates`, `mapZoom`, the ordered
  list of 6 `images`, the `factOrder` (which structured fields become facts and in what order),
  and the `hints` (place name, year built, beds/baths, living/lot m², sold date, and
  `soldPrice` — the correct answer).
- **`public/properties/<slug>/`** — the 6 image files referenced by that config.

### Adding a new house

1. Create `public/properties/my-house/` with 6 images (`photo-1…6.png`, or any names you
   reference in the config — `.jpg`/`.webp` work too).
2. Create `src/properties/my-house.ts` exporting a `PropertyConfig` (copy an existing one).
   Its `facts` are a plain ordered list of strings (one revealed per wrong guess).
3. Register it in `src/properties/index.ts`.
4. Point `ACTIVE_SLUG` at `'my-house'` in `src/admin.ts`.

The three bundled properties use placeholder PNG images — replace them with real photos.

## Deploy to Render

This repo includes `render.yaml` for a **Static Site**. Either:

- **Blueprint:** push to a Git repo, then in Render choose *New → Blueprint* and pick the repo
  (Render reads `render.yaml`), **or**
- **Manual:** *New → Static Site*, set **Build Command** `npm install && npm run build` and
  **Publish Directory** `dist`, and add a rewrite rule `/*` → `/index.html`.

Share the resulting `*.onrender.com` URL.
