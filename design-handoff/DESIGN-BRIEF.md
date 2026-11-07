# Guess The House: design brief

This package describes a live browser game so you can propose design improvements. You have
the screenshots and this document, but not the source code. Everything here was checked against
the code or the running app.

**The ask:** review the game and propose improvements to its UX and visual design. The owner has
not set priorities, so make your own case for what matters most and say why.

Section 8 lists what must not break. Section 9 lists issues noticed while capturing; they're a
starting point, not the limit of the review.

## Background

This game is inspired by [guessthe.house](https://guessthe.house), a daily game about guessing
house prices. This version focuses on Italian houses.

These parts are specific to this version, as far as its code and documentation show. Compare them
against the original yourself if you can open the site, because this package has no screenshots of it:

- the verdict popup and Tassos
- houses from other countries, disguised with a different title icon and flag
- seasonal theming, such as Halloween
- past-day share links

The owner hasn't specified the target audience or how closely the design should follow the
original. Don't assume either: say when a proposal moves away from the original, and state any
audience you assume.

## How to read the screenshots

Files are in `screenshots/`, named `<number>-<state>.<device>.png`. The numbers follow the order
a player meets each state.

| Device | Viewport | Scale |
|---|---|---|
| `desktop` | 1280×900 | 1x |
| `mobile` | 390×844 | 2x |
| `tablet` (3 key states only) | 820×1180 | 1x |

- **Page states** are full-page captures, so they can be taller than the viewport.
- **Overlays and animation moments** are viewport captures, showing what fits on screen.
- **Rendering caveats:**
  - Everything was rendered by Chrome on Windows, with phones emulated by viewport size.
  - Emoji and the system font will look different on iOS, Android and macOS.
  - The on-screen keyboard never appears in these shots.
- **Fake clock:** the browser clock was set to noon Kyiv time, so the countdown always reads about 22 hours.

Screens 01–19 use the house dated 1 November 2026 (price €800,000). The past-day screens use
31 October (€300,000), and the Halloween screens use 29 October (€1,830,000).

---

## 1. The project

**Guess The House** is a daily puzzle in the style of Wordle, played on real Italian property
listings. Every player gets the same house each day and has **6 tries** to guess its price.

### Rules

- A guess **wins** if it's within **±10%** of the price.
- Each wrong guess reveals **one more photo and one more text hint**. The last ones are the most
  revealing.
- Wrong guesses get an arrow pointing toward the real price:

| Guess compared to the price | Arrow |
|---|---|
| Too low | ⬆️ |
| Too low by more than 30% | ⬆️⬆️ |
| Too high | ⬇️ |
| Too high by more than 30% | ⬇️⬇️ |

- A guess of exactly the right price gets its own celebration.
- The map, with a pin on the property, is visible from the first try.

### Daily rhythm

- A new house arrives at **10:00 Europe/Kyiv**, and a countdown shows the time left.
- An open tab reloads itself when the reset passes.
- Progress is saved per house in the browser, so returning players resume where they left off.

### Sharing

Sharing is the game's way of spreading. The Share button copies a spoiler-free result, formatted
for chat apps, with a link that opens that day's house even after the day has passed. See
[section 7](#7-share-text).

### Tone

The voice is deliberately cheeky: a loss says **"You Suck!"** and shares as "Look how much I
suck!". Treat the following as intentional running jokes, and flag them rather than "correcting" them:

- **Flag mix-up:** the default share flag is 🇮🇪 (Irish, not Italian), and the page description says "Italian 🥐 house".
- **Title icon:** an Italy-shaped map in green, white and orange. It links to a YouTube video (the "bonus link"), which can change per house.
- **Disguised houses:** a few houses are from other countries, and those days swap in a different title icon and share flag (`29-title-icon-*`).
- **Tassos:** a shirtless cut-out portrait of "the agent" who asks the price question. A man who looks like him also stands in photo 2 of the 1 November house (screens `05`, `06`).

### Content

There are 153 houses so far, each with 6 photos, 6 hints, coordinates, a price and a link to the
listing. Photos come from idealista listings, so **many have agency and idealista watermarks**
and vary in quality. A photo slot can also be an **animated webp** that loops by itself.

### Technical shape (what limits design ideas)

- It's a **static site with no backend and no accounts**. All game state lives in the player's browser.
- **Nothing shared between players can be displayed today**, such as "how others guessed". Analytics are write-only, sent to a Google Sheet.
- It uses React and Tailwind, with Leaflet and OpenStreetMap for the map and `canvas-confetti` for effects.
- A proposal needing a backend isn't off-limits, but label it clearly as a bigger change.

---

## 2. How the screens connect

The game is **one page with no navigation**. There's no menu, settings, help, stats or history
screen. What appears depends on the date, the URL and the saved game.

```text
Open site
 ├─ no house scheduled today ────────► No puzzle screen (22)
 ├─ link with ?day=<earlier date> ───► Past-day game (20, 21) ─┐ same flow, with banner
 └─ house scheduled today ───────────► Game                    ◄┘
                                        │
      Playing (01–05) ◄── wrong guess ──┤◄─► Photo zoom (06)
                                        │
           ┌── within 10% ──────────────┴── 6th wrong guess ──┐
           ▼                                                  ▼
   Win (07, 08) / Exact (10, 11)                     Loss (12, 13)
           └───────────► End state: photo carousel (14, 15) ◄─┘
                                  │ press Share
             ┌── house has the verdict question, no vote yet ──┐
             ▼                                                 │
      Verdict popup (16) ◄─► Photo zoom (17)                   │ otherwise
             │ vote (18), skip, or click away                  │
             ▼                                                 ▼
                    Text copied, button shows "Copied" (19)
```

---

## 3. Screen by screen

### 01–05 · Playing

The main screen. From top to bottom:

- title and icon
- photo, with an `n / 6` badge and a zoom button
- hints: to the right of the photo at 1024px and wider, below it on narrower screens
- six numbered try buttons
- countdown
- price input and Submit
- list of past guesses
- map

| Screen | What it shows |
|---|---|
| `01-playing-start` | First visit: one photo, one hint, try 1 active, Submit disabled. |
| `02-playing-typing-a-guess` | Input formats live as `€ 450,000`, and Submit becomes active. Non-digits are silently removed. |
| `03-playing-after-3-wrong-guesses` | Mid-game: red try buttons, photo 4, four hints, guess list with arrows. |
| `04-playing-last-try` | All hints showing, five guesses listed, covering all four arrow types across the game. |
| `05-playing-reviewing-an-earlier-try` | Clicking try 2 goes back to photo 2 and outlines its matching hint. Future tries are locked. |

**Try button states:** idle, active (blue ring), wrong (red), correct (green), selected (white
ring). Submitting a guess jumps back to the newest photo.

**Map:** it can be panned and zoomed, and the mouse wheel over it zooms the map rather than
scrolling the page.

### 06 · Photo zoom

`06-playing-photo-zoomed`. A click on the photo or the zoom button opens it full-screen over a
90% black backdrop. A click anywhere or Escape closes it. During play it has no arrows.

### 07–09 · Win

| Screen | What it shows |
|---|---|
| `07-win-confetti-moment` | Confetti from both sides, about half a second after winning. |
| `08-win-result` | **"Good Job!"**, the price, the % off, a link to the listing, and Share. |
| `09-win-returning-to-finished-game` | After a reload, the result returns at once, and the confetti plays again. |

When the game ends:

- The input and **the list of past guesses disappear**.
- Remaining hints appear one by one.
- Two seconds after a win, unused try buttons lighten.

### 10–11 · Exact guess

`10-exact-guess-confetti-moment`, `11-exact-guess-result`. The banner becomes **"RIGHT ON THE
MONEY! 🎯"**, the copy says "you nailed the exact price!", and an extra burst fires from the centre.

### 12–13 · Loss

`12-loss-thumbs-down-rain` shows 👎 emoji falling from the top. `13-loss-result` shows the settled
**"You Suck!"** in red, the price, and the closest guess's % off. All try buttons are red.

### 14–15 · End-of-game carousel

After a win or a loss, the photo area becomes a carousel, and every try button works.

- `14-end-carousel-next-photo`: prev/next arrows on the photo, and the matching hint is outlined.
- `15-end-carousel-photo-zoomed`: the zoom view gains prev/next arrows and ←/→ keys.

Photos crossfade and advance by themselves every 5 seconds. Any manual navigation restarts that
timer, and zooming pauses it. On touch screens, a swipe changes the photo.

### 16–19 · Share and the price verdict

Pressing Share on most houses (105 of 153) first opens a popup asking for an opinion on the price.

| Screen | What it shows |
|---|---|
| `16-verdict-popup` | First photo, price, Tassos asking the question, three cards: 🤑 Steal, 🤝 Fair, 🚨 Rip-off, and a "skip →" link. |
| `17-verdict-photo-zoomed` | Clicking the photo zooms it above the popup. Closing returns to the popup. |
| `18-verdict-vote-chosen` | The chosen card pops and the others fade. The popup closes after half a second. |
| `19-share-copied-feedback` | The text is on the clipboard and the Share button reads "Copied" for 2.5 seconds. |

- A vote is saved and adds a line to the share text. Later shares skip the popup.
- Skip or a click outside still copies the text, without a verdict. The popup returns on the next Share until the player votes.
- The other 48 houses copy straight away with no popup.

### 20–21 · Past-day link

Share links pin their day, so a friend clicking tomorrow still gets that house.

`20-past-day-link` shows an amber banner with the date and a "Play today's house →" button.
The countdown is hidden. The game is fully playable and saved separately.
`21-past-day-banner-stays-pinned` (mobile) shows the banner staying on top while scrolling.

Links to today, the future or an invalid date quietly open today's house instead.

### 22 · No puzzle today

`22-no-puzzle-today`. Shown when no house is scheduled for the date: the title, "No puzzle today —
check back soon!", and the countdown. There's nothing else to do on this screen.

### 23–28 · Seasonal theme: Halloween

Houses dated 27–31 October got a dress-up, which switched itself off at the 1 November reset. It's
inactive now, but shows how far theming can go and could be a template for future seasons.

| Screen | What it shows |
|---|---|
| `23-halloween-start` | Near-black purple palette, orange buttons, Creepster font, cobwebs, drifting fog, 🕯️ hints, tombstone tries, purple night map, pumpkin pin. |
| `24-halloween-after-3-wrong-guesses` | Mid-game, with tombstones in their states. Each new photo also gets a candle flicker (not visible in stills). |
| `25-halloween-win-candy-confetti` | 🍬🍭🎃 confetti. |
| `26-halloween-win-result` | Result screen in the theme. |
| `27-halloween-verdict-popup` | The popup keeps its usual slate colours and isn't themed. |
| `28-halloween-loss-ghost-rain` | 👻🦇💀 falling on a loss. |

### 29 · Title icon variants

`29-title-icon-italy-default`, `-spain`, `-greece`, `-finland`. The icon changes per house.

---

## 4. Layout

- Single column, capped at **448px wide**, centred on the page (page container up to 1024px).
- At **1024px and wider**, hints move into a **224px column** to the right of the photo. An invisible column of the same width on the left keeps the photo centred.
- Photos are cropped to **4:3**. The map is **240px** tall.
- On phones, hints sit between the photo and the input, so **the input moves down as hints appear**. Measured at 390×844: it starts 479px from the top and reaches 699px on the last try. The full page is then 1,313px tall.

## 5. Visual tokens

The whole palette is five CSS variables, which is what makes seasonal re-theming possible.

| Token | Default | Halloween |
|---|---|---|
| backdrop | `#0e1b2a` | `#120a1c` |
| panel | `#13263b` | `#271838` |
| panel alt | `#0c1a29` | `#180e24` |
| accent (buttons) | `#16a34a` | `#ea580c` |
| accent hover | `#22c55e` | `#f97316` |

The rest uses Tailwind defaults: `slate` for text and the popup, `green-400` for prices and wins,
`red-500`/`red-600` for losses and wrong tries, `sky-400` for links and active states, `amber-400`
for the past-day banner.

**Type:** the system stack only (`Segoe UI`, then `system-ui` and platform fonts), with no web
font except Creepster at Halloween. Title 24–30px bold, result banner 30px extra-bold.

**Sizes:** try buttons 24×24px, input and Submit 32px tall, zoom button 36px, carousel arrows 40px.

**Icons:** mostly emoji (💡 ⬆️ ⬇️ 🤑 🤝 🚨 🎯), so their look depends on the player's device.

## 6. Motion

Stills can't show these, so here is the behaviour from the code.

| Moment | Behaviour |
|---|---|
| New hint | Fade and slight scale pop, 1s |
| Hints at game end | Remaining ones appear 450ms apart |
| Try button colour change | 700ms transition |
| Win | 70 confetti pieces from each side; unused tries lighten after 2s |
| Exact guess | Plus 180 pieces from the centre |
| Loss | 4 emoji every 150ms, 12 times, falling under gravity |
| Carousel | 700ms crossfade, advances every 5s; controls fade in over 0.8s |
| Verdict vote | Chosen card scales to 110%, others fade to 30% (300ms); popup closes at 500ms |
| Share button | "Copied" for 2.5s |
| Countdown | Ticks every second |
| Halloween | 900ms candle flicker on each new photo; fog layers drifting on 45s and 70s loops |

## 7. Share text

Exact text produced by the game (`<site>` is the site address). `||…||` is Discord/Telegram spoiler
markup, so the verdict stays hidden until tapped.

Win with a verdict:

```text
Guess The House 🇮🇪
🇮🇪 🟥 🟥 🟩 ⬜ ⬜ ⬜
🎯 I was 3% off
🧾 My verdict: ||Fair price 🤝||
<site>/?day=01_11_26
```

Exact guess with a verdict:

```text
Guess The House 🇮🇪
🇮🇪 🟩 ⬜ ⬜ ⬜ ⬜ ⬜
🎯 RIGHT ON THE MONEY! (0% off)
🧾 My verdict: ||RIP-OFF 🚨||
<site>/?day=01_11_26
```

Loss, verdict skipped:

```text
Guess The House 🇮🇪
🇮🇪 🟥 🟥 🟥 🟥 🟥 🟥
Look how much I suck!
<site>/?day=01_11_26
```

Link previews use a title and description only. There's no preview image.

## 8. What must not break

- **The share text never reveals a euro amount**, and the verdict stays behind a spoiler.
- **The price stays hidden until the game ends.**
- **One photo and one hint per wrong guess, 6 of each.** The content is built around this.
- **Adding a house needs no code change**, just a folder of 6 photos and a config file. Designs can't rely on hand-tuned content per house.
- **Layouts must cope with imperfect listing photos** and with hints of varying length.
- **Overlays must sit above the map.** Leaflet's layers go up to z-index 1000.
- **Motion is part of the game's personality.** Sharpen it rather than remove it.

## 9. Noticed while capturing

These are observations, not requirements. Weigh them yourself.

**Understanding the game**
- **The rules aren't explained on screen.** Nothing tells a new player about the 6 tries, the ±10% win margin, or what a double arrow means.
- **Guess history disappears at game end.** The player sees the price, but no longer their own guesses.
- **Invalid input gets no feedback.** Non-digits vanish and Submit just stays disabled.
- **A failed copy gets no feedback.** If the clipboard write fails, the Share button simply doesn't change.

**Phone ergonomics**
- **Small tap targets:** try buttons are 24×24px, and the input and Submit are 32px tall.
- **The input drifts down** as hints accumulate (see section 4), while the on-screen keyboard also needs room.
- **"Rip-off" wraps onto two lines** on its card at 390px wide (`16-verdict-popup.mobile`), which makes the three cards uneven.

**Visual details**
- **Tassos's portrait shows a hard dark rectangular edge** against the popup (`16-verdict-popup.mobile`).
- **Past-day banner on desktop** stops at the page container's width instead of running edge to edge (`20-past-day-link.desktop`).
- **The verdict popup isn't themed** at Halloween (`27`).
- **Desktop empty space:** at the start of a game, the right column holds a single hint with nothing below it (`01-playing-start.desktop`).
- **Watermarks** sit across the middle of many photos.

**Behaviour**
- **Celebrations replay on every reload** of a finished game (`09`).
- **Reduced-motion is only partly respected.** The loss rain, fog and flicker honour the setting; the win confetti, hint pop and crossfade don't.
- **The mouse wheel over the map** zooms the map, which can interrupt scrolling the page on desktop.
