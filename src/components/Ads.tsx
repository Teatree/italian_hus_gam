// The two reserved ad slots. They are placeholders (a labelled box showing the reserved size):
// no ad tag is wired up yet, so both are only rendered while ADS_ENABLED (src/admin.ts) is on.
// Each slot reserves its full size up front, so nothing on the page moves when an ad arrives.
//
// When real tags go in: mount the ad inside the slot element, and if the network reports no
// fill, stop rendering that slot — never leave an empty grey box in production.

// 300×250, in the page flow under the map.
export function AdSlot() {
  return (
    <aside className="ad" aria-label="Advertisement">
      <span className="ad__label">ADVERTISEMENT</span>
      <div className="ad__slot">300 × 250</div>
    </aside>
  );
}

// 320×50, pinned to the bottom of the viewport in a full-bleed bar. The page reserves room for
// it through the `has-anchor` class on the app root.
export function AnchorAd() {
  return (
    <aside className="anchor-ad" aria-label="Advertisement">
      <div className="anchor-ad__slot">Ad · 320 × 50 sticky anchor</div>
    </aside>
  );
}
