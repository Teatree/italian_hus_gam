// Measured "drive time to the nearest notable city" hint, used by autofill-config.mjs.
//
// Routing is the free OSRM demo server (router.project-osrm.org, car profile, no API key),
// which returns free-flow durations — i.e. best road conditions. One `table` request per
// autofill run is well within its fair-use policy. Callers must catch errors and simply
// skip the hint: this is an authoring-time nicety, never worth failing a run over.
//
// Picking the city is NOT "whichever is nearest". Nearest-by-population-threshold gave bad
// hints: for a property near Corigliano-Rossano it chose Lamezia Terme (70,501, an hour and
// 55 minutes away) over Cosenza (63,852, 66 minutes) purely because Cosenza fell 6,149 people
// under a 70k cut — even though Cosenza is the *provincial capital* and Lamezia Terme is not.
//
// So instead: cast a wide net (every place >= 20k), shortlist a dozen, and score each on
// drive time MINUS a prominence bonus. The bonus reads as "how many extra minutes of driving
// this place's standing is worth". Lowest score wins.

// The candidate list (population >= 20k, with GeoNames feature code and population) lives in
// big-cities.mjs, generated from GeoNames by generate-big-cities.mjs — re-run that to change
// the threshold or add a country.
import { BIG_CITIES } from './big-cities.mjs';

export { BIG_CITIES };

// Prominence bonus by GeoNames administrative rank, in "minutes of extra driving this is
// worth". The rank is a free, accurate proxy for the amenities that make a place a good
// hint: in Italy a provincial capital (PPLA2) is where the hospital, courts, station and
// often a university are. PPL means no administrative role at all — a frazione or a suburb
// — so it is PENALISED: without that, "Rossano Stazione" (a frazione of the property's own
// comune) beat Cosenza by a single point.
const RANK_BONUS_MINUTES = {
  PPLC: 90, // national capital
  PPLA: 60, // first-order (regional) capital
  PPLA2: 35, // second-order (provincial) capital
  PPLA3: 0, // third-order seat — the baseline
  PPLA4: 0,
  PPL: -25, // no administrative role
  PPLL: -25,
};

// Size bonus on top of rank: ~10 min at 100k, ~25 min at 1M. Log-scaled so a metropolis is
// worth a detour without letting population alone dominate the way the old rule did.
const SIZE_BONUS_PER_DECADE = 15;
const SIZE_BONUS_FLOOR_POP = 20_000;

// Shortlist size. Nearest-by-air alone is not enough: around Taormina the eight closest
// places are all small Catania-area towns, which crowded Messina out of the running
// entirely. So the shortlist is the union of "nearest anything" and "nearest real cities".
const NEAREST_COUNT = 8;
const MAJOR_COUNT = 4;
const MAJOR_RANKS = new Set(['PPLC', 'PPLA', 'PPLA2']);
const MAJOR_MAX_AIR_KM = 150;

// Beyond this the hint stops being useful, and it guards against nonsense routes: OSRM will
// happily "drive" from Lampedusa to Gela in 2,761 minutes (46 hours) across open sea.
const MAX_DRIVE_MINUTES = 150;

// How much extra driving this place's standing is worth, in minutes.
export function prominenceBonus(city) {
  const rank = RANK_BONUS_MINUTES[city.fcode] ?? 0;
  const size = Math.max(0, SIZE_BONUS_PER_DECADE * Math.log10(city.pop / SIZE_BONUS_FLOOR_POP));
  return rank + size;
}

export function haversineKm([lat1, lng1], [lat2, lng2]) {
  const rad = (d) => (d * Math.PI) / 180;
  const a =
    Math.sin(rad(lat2 - lat1) / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

// The dozen-or-so places worth routing to from `coords`: the nearest few of anything, plus
// the nearest few genuine cities, so a regional capital just over the horizon still competes.
// Deduped by name — one place can qualify on both counts.
export function shortlistCandidates(coords) {
  const byAir = BIG_CITIES.map((c) => ({ ...c, airKm: haversineKm(coords, c.coords) })).sort(
    (a, b) => a.airKm - b.airKm,
  );
  const nearest = byAir.slice(0, NEAREST_COUNT);
  const major = byAir.filter((c) => MAJOR_RANKS.has(c.fcode) && c.airKm <= MAJOR_MAX_AIR_KM).slice(0, MAJOR_COUNT);
  return [...new Map([...nearest, ...major].map((c) => [c.name, c])).values()];
}

// Drive time (car, free-flow) from `coords` ([lat, lng]) to the best nearby city, where
// "best" balances how far it is against how notable it is (see prominenceBonus). All
// candidates go into a single OSRM `table` request; nearest-by-air isn't nearest-by-road
// anyway (mountains, straits), and one request costs the same whether it holds 5 or 12.
//
// Returns { city, minutes, km, score, runnerUp } — runnerUp is for authoring-time logging so
// you can see what it beat and override by hand. Throws on any network/HTTP/routing failure.
export async function driveTimeToNearestCity(coords, { timeoutMs = 15_000 } = {}) {
  const candidates = shortlistCandidates(coords);

  // OSRM wants lng,lat order. Asking for distances too is free — same request.
  const locs = [coords, ...candidates.map((c) => c.coords)].map(([lat, lng]) => `${lng},${lat}`).join(';');
  const url = `https://router.project-osrm.org/table/v1/driving/${locs}?sources=0&annotations=duration,distance`;
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`OSRM responded ${res.status}`);
  const data = await res.json();
  const durations = data?.durations?.[0]?.slice(1); // [0][0] is source→source
  if (data?.code !== 'Ok' || !durations) throw new Error(`OSRM: ${data?.code ?? 'malformed response'}`);
  const distances = data?.distances?.[0]?.slice(1) ?? [];

  const scored = candidates
    .map((c, i) => ({ city: c, minutes: durations[i] / 60, km: distances[i] / 1000 }))
    .filter((r) => Number.isFinite(r.minutes) && r.minutes <= MAX_DRIVE_MINUTES)
    .map((r) => ({ ...r, score: r.minutes - prominenceBonus(r.city) }))
    .sort((a, b) => a.score - b.score);

  if (!scored.length) {
    throw new Error(`no city within ${MAX_DRIVE_MINUTES} min by road`);
  }
  const [best, second] = scored;
  return {
    city: best.city.name,
    minutes: best.minutes,
    km: best.km,
    score: best.score,
    runnerUp: second ? { city: second.city.name, minutes: second.minutes, score: second.score } : null,
  };
}

// "1h 20m to Venice by Car" / "45m to Málaga by Car" / "2h to Rome by Car".
// Rounded to the nearest 5 minutes — this is a hint, not a navigation app.
export function formatDriveTime(minutes, city) {
  const rounded = Math.max(5, Math.round(minutes / 5) * 5);
  const h = Math.floor(rounded / 60);
  const m = rounded % 60;
  const time = h ? (m ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
  return `${time} to ${city} by Car`;
}
