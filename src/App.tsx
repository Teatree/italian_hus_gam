import { useEffect, useState } from 'react';
import { ADS_ENABLED, DEFAULT_TITLE_ICON_URL, OVERRIDE_SLUG } from './admin';
import { track, loadGeo, isMobile } from './analytics';
import { houseNumber, properties } from './properties';
import { formatDateKeyShort, getScheduleInfo, previousDateKey } from './game/schedule';
import { resolvePastDay } from './game/dayLink';
import { useBooting } from './lib/motion';
import { countryOf } from './theme/country';
import { SeasonProvider, activeSeason, useSeasonAssets } from './theme/season';
import { useTheme } from './theme/theme';
import { Game } from './Game';
import { AnchorAd } from './components/Ads';
import { Countdown } from './components/Countdown';
import { Awning, Header } from './components/Header';
import { NoCasa } from './components/NoCasa';
import { PastDayBanner } from './components/PastDayBanner';
import { HelpSheet } from './components/Sheets';

// The page shell: works out which house is active today, dresses the page for it (theme,
// country, season), and frames either the game or the "no casa today" card. It also reloads
// the page at the daily reset.
export default function App() {
  // Resolve the schedule once on mount; the page reloads at the reset boundary anyway.
  const [{ dateKey, nextResetMs }] = useState(() => getScheduleInfo());
  // A shared link may pin an earlier day (?day=DD_MM_YY); null = today's puzzle.
  const [pastDay] = useState(() => resolvePastDay(dateKey, (s) => s in properties));

  const slug = OVERRIDE_SLUG ?? pastDay ?? dateKey;
  // The past-day banner shows whenever the house on screen isn't today's scheduled one.
  const isPastDay = !OVERRIDE_SLUG && pastDay !== null;
  const property = properties[slug] ?? null;

  // How the page is dressed. All three come from data the house already has: its date decides
  // the season, its title icon / share flag decide the country (src/theme/*).
  const season = property !== null ? activeSeason(property.slug, dateKey) : null;
  const country = countryOf(property);
  const { mode, toggle } = useTheme(country, season?.key ?? null);
  useSeasonAssets(season);

  // Nothing animates on first paint: the root wears `no-anim` for the first two frames.
  const booting = useBooting();
  const [helpOpen, setHelpOpen] = useState(false);

  // When the daily reset passes while a player is here, reload so the new puzzle loads
  // fresh (and we never run the previous day's game state against a new property). A pinned
  // past day doesn't change at the reset, so there's nothing to reload for — unless it's
  // wearing a season, which must still drop off at the reset after its last day.
  useEffect(() => {
    if (pastDay && !season) return;
    const check = () => {
      if (Date.now() >= nextResetMs) window.location.reload();
    };
    const id = window.setInterval(check, 1000);
    // A tab that slept through the reset reloads as soon as it is looked at again.
    document.addEventListener('visibilitychange', check);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', check);
    };
  }, [nextResetMs, pastDay, season]);

  // One Sessions row per page load: who showed up, from where, on what. Fires after the geo
  // lookup so ip/country/city are populated. Runs even on the "no casa" screen (still a visit).
  useEffect(() => {
    const seenKey = 'gth:analytics:seen';
    let isReturning = false;
    try {
      isReturning = localStorage.getItem(seenKey) === '1';
      localStorage.setItem(seenKey, '1');
    } catch {
      // ignore storage failures (private mode, etc.)
    }
    void loadGeo().then((g) => {
      track('Sessions', {
        puzzleDate: slug,
        city: g.city,
        isReturning,
        referrer: document.referrer,
        userAgent: navigator.userAgent,
        device: isMobile() ? 'mobile' : 'desktop',
        language: navigator.language,
        screenW: window.innerWidth,
      });
    });
    // Only once per mount (one page load = one session).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The "bonus link" behind the flag chip and in the footer. A config can blank it ("").
  const bonusUrl = property?.titleIconUrl ?? DEFAULT_TITLE_ICON_URL;
  // "Play yesterday's casa" on the empty-day card, only if yesterday had a house.
  const yesterday = previousDateKey(dateKey);
  const yesterdaySlug = yesterday !== null && yesterday in properties ? yesterday : null;

  return (
    <SeasonProvider value={season}>
      <div className={`app${booting ? ' no-anim' : ''}${ADS_ENABLED ? ' has-anchor' : ''}`}>
        {isPastDay && property && <PastDayBanner dateKey={property.slug} />}
        <Awning />
        {season?.Decor && <season.Decor />}

        <div className="column">
          <Header
            country={country}
            houseNumber={property ? houseNumber(property.slug) : null}
            bonusUrl={bonusUrl}
            theme={mode}
            onToggleTheme={season ? undefined : toggle}
            onHelp={() => setHelpOpen(true)}
            meta={
              // The countdown is about today's puzzle; a past day's page shows its date instead.
              isPastDay && property ? (
                formatDateKeyShort(property.slug)
              ) : (
                <>
                  <span className="meta__label">New casa in </span>
                  <Countdown targetMs={nextResetMs} />
                </>
              )
            }
          />

          {property ? (
            // `key` ensures a clean remount (fresh game state) if the active property changes.
            <Game
              key={property.slug}
              property={property}
              country={country}
              nextResetMs={nextResetMs}
              isPastDay={isPastDay}
              bonusUrl={bonusUrl}
              paused={helpOpen}
            />
          ) : (
            <NoCasa targetMs={nextResetMs} yesterday={yesterdaySlug} />
          )}
        </div>

        {ADS_ENABLED && <AnchorAd />}
      </div>

      <HelpSheet open={helpOpen} onClose={() => setHelpOpen(false)} />
    </SeasonProvider>
  );
}
