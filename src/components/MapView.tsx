import { useMemo, useState } from 'react';
import { MapContainer, Marker, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import { useSeason } from '../theme/season';
import { LayersIcon } from './Icons';

// Street map (OpenStreetMap) and satellite imagery (Esri World Imagery), switched with the
// button in the map's corner. Both are free tile services; the dark-mode filter is deliberately
// not applied to either — the map is always shown as drawn.
const TILES = {
  map: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
};

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

interface MapViewProps {
  lat: number;
  lng: number;
  zoom: number;
}

// A small map centred on the property, with a pin on it, and a Satellite / Map toggle. The
// mouse wheel zooms the map as soon as the pointer is over it (no click needed first).
export function MapView({ lat, lng, zoom }: MapViewProps) {
  const season = useSeason();
  const [satellite, setSatellite] = useState(false);
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
    <div className="map">
      <div className="map__frame">
        <MapContainer
          key={`${lat},${lng}`}
          center={[lat, lng]}
          zoom={zoom}
          scrollWheelZoom
          attributionControl={false}
        >
          <TileLayer key={satellite ? 'sat' : 'map'} url={satellite ? TILES.satellite : TILES.map} maxNativeZoom={satellite ? 18 : 19} maxZoom={19} />
          <Marker position={[lat, lng]} icon={icon} interactive={false} keyboard={false} />
        </MapContainer>
        <button
          className={`map__layer${satellite ? ' is-sat' : ''}`}
          type="button"
          onClick={() => setSatellite((s) => !s)}
          aria-pressed={satellite}
          aria-label={satellite ? 'Show the street map' : 'Show satellite imagery'}
        >
          <LayersIcon />
          {satellite ? 'Map' : 'Satellite'}
        </button>
      </div>
    </div>
  );
}
