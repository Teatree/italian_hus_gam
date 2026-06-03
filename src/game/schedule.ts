import { RESET_HOUR, RESET_TIME_ZONE } from '../admin';

// Computes which puzzle day we're in and when the next daily reset happens.
// A "puzzle day" runs from RESET_HOUR (wall-clock, DST-aware) on its date until the same
// time the next day. The day's property is the one whose slug matches the date as DD_MM_YY.

interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

// Read the wall-clock Y/M/D/H/M/S of an instant in the configured time zone.
function getZonedParts(date: Date): ZonedParts {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: RESET_TIME_ZONE,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const map: Record<string, string> = {};
  for (const p of fmt.formatToParts(date)) map[p.type] = p.value;
  let hour = Number(map.hour);
  if (hour === 24) hour = 0; // some engines report midnight as 24
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour,
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

// The epoch ms for a given wall-clock time (year, month, day, hour:00) in the zone,
// handling daylight saving correctly.
function zonedWallclockToUtc(year: number, month: number, day: number, hour: number): number {
  const guessUtc = Date.UTC(year, month - 1, day, hour, 0, 0);
  const p = getZonedParts(new Date(guessUtc));
  const zonedAsUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  const offset = zonedAsUtc - guessUtc; // zone offset at that moment
  return guessUtc - offset;
}

const pad = (n: number) => String(n).padStart(2, '0');
const DAY_MS = 86_400_000;

export interface ScheduleInfo {
  dateKey: string; // current puzzle date as DD_MM_YY (matches a property slug)
  nextResetMs: number; // epoch ms of the next reset boundary
}

export function getScheduleInfo(now: Date = new Date()): ScheduleInfo {
  const z = getZonedParts(now);
  const todayResetMs = zonedWallclockToUtc(z.year, z.month, z.day, RESET_HOUR);
  const afterReset = now.getTime() >= todayResetMs;

  // Puzzle date = the zoned calendar date of the most recent reset. Before today's reset
  // we're still on yesterday's puzzle. (UTC math here is just date arithmetic.)
  const baseMidnightUtc = Date.UTC(z.year, z.month - 1, z.day);
  const puzzleDate = new Date(afterReset ? baseMidnightUtc : baseMidnightUtc - DAY_MS);
  const dateKey =
    `${pad(puzzleDate.getUTCDate())}_${pad(puzzleDate.getUTCMonth() + 1)}_` +
    `${pad(puzzleDate.getUTCFullYear() % 100)}`;

  // Next reset: today's boundary if we haven't passed it, otherwise tomorrow's.
  let nextResetMs = todayResetMs;
  if (afterReset) {
    const tomorrow = new Date(baseMidnightUtc + DAY_MS);
    nextResetMs = zonedWallclockToUtc(
      tomorrow.getUTCFullYear(),
      tomorrow.getUTCMonth() + 1,
      tomorrow.getUTCDate(),
      RESET_HOUR,
    );
  }

  return { dateKey, nextResetMs };
}
