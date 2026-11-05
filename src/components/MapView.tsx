import { useEffect, useMemo } from 'react';
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useSeason } from '../theme/season';

// The pin is a divIcon holding a 28×38 teardrop, anchored at its tip. Its colours are CSS
// (.gmc-pin in app.css): the body is --accent and the dot --bg, so it follows the theme and
// the country by itself, with nothing to rebuild.
const pinIcon = L.divIcon({
  className: 'gmc-pin',
  iconSize: [28, 38],
  iconAnchor: [14, 38],
  html: `<svg width="28" height="38" viewBox="0 0 28 38" aria-hidden="true">
  <path class="gmc-pin__body" d="M14 38C9 31 0 22 0 14a14 14 0 0 1 28 0c0 8-9 17-14 24z"/>
  <circle class="gmc-pin__dot" cx="14" cy="14" r="5"/>
</svg>`,
});

// The mouse wheel only zooms the map after the player has clicked or focused it, and stops
// again when the pointer or the focus leaves — so scrolling the page past the map just scrolls
// the page. Touch pinch and drag are untouched.
function WheelGuard() {
  const map = useMap();
  useEffect(() => {
    const el = map.getContainer();
    const enable = () => map.scrollWheelZoom.enable();
    const disable = () => map.scrollWheelZoom.disable();
    el.addEventListener('click', enable);
    el.addEventListener('focus', enable);
    el.addEventListener('mouseleave', disable);
    el.addEventListener('blur', disable);
    return () => {
      el.removeEventListener('click', enable);
      el.removeEventListener('focus', enable);
      el.removeEventListener('mouseleave', disable);
      el.removeEventListener('blur', disable);
    };
  }, [map]);
  return null;
}

interface MapViewProps {
  lat: number;
  lng: number;
  zoom: number;
}

// A small map centred on the property, with a pin on it. In dark mode (and in a season) the
// tiles — and only the tiles — are filtered through --map-filter.
export function MapView({ lat, lng, zoom }: MapViewProps) {
  const season = useSeason();
  const icon = useMemo(
    () =>
      season?.pin
        ? L.divIcon({
            className: 'gmc-pin gmc-pin--season',
            iconSize: season.pin.size,
            iconAnchor: season.pin.anchor,
            html: season.pin.html,
          })
        : pinIcon,
    [season],
  );

  return (
    <figure className="map">
      <div className="map__frame">
        <MapContainer
          key={`${lat},${lng}`}
          center={[lat, lng]}
          zoom={zoom}
          scrollWheelZoom={false}
          attributionControl={false}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Marker position={[lat, lng]} icon={icon} interactive={false} keyboard={false} />
          <WheelGuard />
        </MapContainer>
      </div>
      <figcaption>
        ©{' '}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">
          OpenStreetMap
        </a>{' '}
        contributors
      </figcaption>
    </figure>
  );
}
