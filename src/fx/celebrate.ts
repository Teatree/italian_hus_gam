import confetti from 'canvas-confetti';
import { THUMBS_DOWN_SVG } from '../components/Icons';
import { prefersReducedMotion } from '../lib/motion';
import { COUNTRY, type CountryCode } from '../theme/country';
import type { Season } from '../theme/season';

// End-of-game effects. They are fired from the guess that ends the game — never from a render —
// so a finished game that is reloaded or reopened does not celebrate again.
// Both layers sit at --z-fx (1150): above the map and the anchor ad, below sheets and the zoom,
// and neither ever takes a click.

const Z_FX = 1150;

function token(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

// Win: two bursts of confetti from the left and right edges, in the house's flag colours plus
// the accent and the "ok" green (read at fire time, so they follow the theme and the country).
// An exact guess adds a 180-piece burst from the centre. A season can swap the paper for its
// own glyphs (Halloween: candy and pumpkins) — bigger pieces, so fewer of them.
export function fireConfetti(exact: boolean, country: CountryCode, season: Season | null): void {
  const colors = [...COUNTRY[country].flag, token('--accent'), token('--ok')].filter(Boolean);
  const glyphs = season?.confettiGlyphs;
  const treats = glyphs
    ? {
        shapes: glyphs.map((text) => confetti.shapeFromText({ text, scalar: 2.2 })),
        scalar: 2.2,
        flat: true,
      }
    : null;
  const count = (n: number) => (treats ? Math.round(n * 0.45) : n);

  const base = {
    particleCount: count(70),
    spread: 40,
    startVelocity: 55,
    gravity: 1,
    decay: 0.92,
    ticks: 260,
    scalar: 1,
    colors,
    disableForReducedMotion: true,
    zIndex: Z_FX,
    ...treats,
  };
  confetti({ ...base, angle: 60, origin: { x: 0, y: 0.62 } }); // from the left edge
  confetti({ ...base, angle: 120, origin: { x: 1, y: 0.62 } }); // from the right edge
  if (exact) {
    confetti({
      particleCount: count(180),
      spread: 360,
      startVelocity: 32,
      gravity: 0.9,
      ticks: 280,
      origin: { x: 0.5, y: 0.42 },
      colors,
      disableForReducedMotion: true,
      zIndex: Z_FX,
      ...treats,
    });
  }
}

const RAIN_WAVES = 12;
const RAIN_PER_WAVE = 4;
const RAIN_WAVE_MS = 150;

// Loss: thumbs-down icons raining from above the viewport — 12 waves of 4, one wave every
// 150ms, each falling under gravity for 1.5–2.4s while it turns (the `fall` keyframes in
// app.css). A season swaps the icon for its glyphs (Halloween: ghosts, bats, skulls).
// Each drop removes itself when it lands; the layer goes with the last one.
// Returns a function that stops the rain early (used when the game unmounts).
export function startRain(season: Season | null): () => void {
  if (prefersReducedMotion()) return () => {};

  const layer = document.createElement('div');
  layer.className = 'rain';
  layer.setAttribute('aria-hidden', 'true');
  document.body.appendChild(layer);

  const glyphs = season?.rainGlyphs;
  let wave = 0;
  let live = 0;
  let spawning = true;

  const drop = () => {
    const size = 22 + Math.random() * 14;
    let el: HTMLElement | SVGElement;
    if (glyphs) {
      el = document.createElement('span');
      el.textContent = glyphs[Math.floor(Math.random() * glyphs.length)];
      el.style.fontSize = `${size}px`;
    } else {
      const holder = document.createElement('div');
      holder.innerHTML = THUMBS_DOWN_SVG;
      el = holder.firstElementChild as SVGElement;
      el.setAttribute('width', String(size));
      el.setAttribute('height', String(size));
    }
    el.style.left = `${Math.random() * Math.max(0, window.innerWidth - size)}px`;
    el.style.setProperty('--d', `${1.5 + Math.random() * 0.9}s`);
    el.style.setProperty('--r0', `${Math.random() * 60 - 30}deg`);
    el.style.setProperty('--r1', `${Math.random() * 120 - 60}deg`);
    live++;
    el.addEventListener('animationend', () => {
      el.remove();
      if (--live === 0 && !spawning) layer.remove();
    });
    layer.appendChild(el);
  };

  const interval = window.setInterval(() => {
    for (let i = 0; i < RAIN_PER_WAVE; i++) drop();
    if (++wave >= RAIN_WAVES) {
      spawning = false;
      window.clearInterval(interval);
    }
  }, RAIN_WAVE_MS);

  return () => {
    spawning = false;
    window.clearInterval(interval);
    layer.remove();
  };
}
