// Measured "drive time to the nearest big city" hint, used by autofill-config.mjs.
//
// Routing is the free OSRM demo server (router.project-osrm.org, car profile, no API key),
// which returns free-flow durations — i.e. best road conditions. One `table` request per
// autofill run is well within its fair-use policy. Callers must catch errors and simply
// skip the hint: this is an authoring-time nicety, never worth failing a run over.

// The "big city" list (population >= 70k) lives in big-cities.mjs, generated from GeoNames
// by generate-big-cities.mjs — re-run that to change the threshold or add a country.
import { BIG_CITIES } from './big-cities.mjs';

export { BIG_CITIES };

export function haversineKm([lat1, lng1], [lat2, lng2]) {
  const rad = (d) => (d * Math.PI) / 180;
  const a =
    Math.sin(rad(lat2 - lat1) / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

// Drive time (car, free-flow) from `coords` ([lat, lng]) to the nearest big city.
// Nearest-by-air isn't always nearest-by-road (mountains, straits), so the 5 closest
// candidates by air go into a single OSRM `table` request and the road winner is taken.
// Returns { city, minutes }; throws on any network/HTTP/routing failure.
export async function driveTimeToNearestCity(coords, { timeoutMs = 15_000 } = {}) {
  const candidates = BIG_CITIES.map((c) => ({ ...c, airKm: haversineKm(coords, c.coords) }))
    .sort((a, b) => a.airKm - b.airKm)
    .slice(0, 5);

  // OSRM wants lng,lat order.
  const locs = [coords, ...candidates.map((c) => c.coords)].map(([lat, lng]) => `${lng},${lat}`).join(';');
  const url = `https://router.project-osrm.org/table/v1/driving/${locs}?sources=0&annotations=duration`;
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`OSRM responded ${res.status}`);
  const data = await res.json();
  const durations = data?.durations?.[0]?.slice(1); // [0][0] is source→source
  if (data?.code !== 'Ok' || !durations) throw new Error(`OSRM: ${data?.code ?? 'malformed response'}`);

  let best = null;
  durations.forEach((sec, i) => {
    if (typeof sec === 'number' && (!best || sec < best.sec)) best = { sec, city: candidates[i].name };
  });
  if (!best) throw new Error('OSRM found no route to any candidate city');
  return { city: best.city, minutes: best.sec / 60 };
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
