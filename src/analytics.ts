// Lightweight, fire-and-forget analytics. The browser POSTs one row per event to a Google
// Apps Script web app, which appends it to the matching tab in a Google Sheet — there is no
// backend of our own. Each call is best-effort and must never block or break gameplay.
//
// Geo (ip + country + city) comes from ip-api.com, looked up once per page load.
// ⚠️ ip-api.com's FREE endpoint is HTTP-only. A browser on an HTTPS page will block it as
// "mixed content", so on the deployed (HTTPS) site ip/country/city will be empty. It works
// over plain HTTP — e.g. the local dev server at http://localhost:5173. For HTTPS in prod you
// need ip-api.com Pro (HTTPS) or a free HTTPS geo provider (e.g. ipwho.is).

const ANALYTICS_URL =
  (import.meta.env.VITE_ANALYTICS_URL as string | undefined) ??
  'https://script.google.com/macros/s/AKfycbxUdBfTKaNfAJD2tgT51Mr9UMc4eKzvWEvOIcQEyL1lcuaTmx6C1TRh2wyhg_HmdkfL/exec';

type SheetName = 'Sessions' | 'Guesses' | 'Results';

export function randomId(prefix: string): string {
  return prefix + Math.random().toString(36).slice(2, 9);
}

// One id per page load; shared by every event from this play session.
export const sessionId = randomId('s_');

interface Geo {
  ip: string;
  country: string;
  city: string;
}

let geo: Geo = { ip: '', country: '', city: '' };
let geoPromise: Promise<Geo> | null = null;

// Look up the visitor's IP/country/city once; the result is cached for the rest of the
// session and merged into every later event. Resolves to empty fields on any failure.
export function loadGeo(): Promise<Geo> {
  if (!geoPromise) {
    geoPromise = fetch('http://ip-api.com/json/?fields=status,country,city,query')
      .then((r) => r.json())
      .then((d) => {
        if (d && d.status === 'success') {
          geo = { ip: d.query ?? '', country: d.country ?? '', city: d.city ?? '' };
        }
        return geo;
      })
      .catch(() => geo);
  }
  return geoPromise;
}

// Fire-and-forget one event. `sheet` picks the tab; sessionId + ip + country are attached
// automatically. Swallows every error so analytics can never interrupt the game.
export function track(sheet: SheetName, data: Record<string, unknown>): void {
  if (!ANALYTICS_URL) return;
  const payload = JSON.stringify({
    sheet,
    sessionId,
    ip: geo.ip,
    country: geo.country,
    ...data,
  });
  try {
    void fetch(ANALYTICS_URL, {
      method: 'POST',
      // text/plain keeps this a "simple" request: no CORS preflight, which an Apps Script
      // web app can't answer. The Apps Script JSON.parse()s the body either way.
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: payload,
      keepalive: true, // let the POST finish even if the page is unloading
    }).catch(() => {});
  } catch {
    // ignore — analytics must never throw into the game
  }
}

export function isMobile(): boolean {
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}
