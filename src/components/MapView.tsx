import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
// Leaflet's default marker icon resolves its image URLs relative to the stylesheet, which
// breaks under Vite's bundling — import the images explicitly so the pin shows up in prod.
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { useHalloween } from '../theme/halloween';

const pinIcon = new L.Icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  shadowSize: [41, 41],
});

// Halloween pin: a glowing jack-o'-lantern sitting on the property's location.
const PUMPKIN_SVG = `<svg viewBox="0 0 64 64" width="40" height="40" xmlns="http://www.w3.org/2000/svg">
  <path d="M31 16 Q31 7 38 4" stroke="#4d7c0f" stroke-width="5" fill="none" stroke-linecap="round"/>
  <ellipse cx="20" cy="38" rx="15" ry="21" fill="#c2410c"/>
  <ellipse cx="44" cy="38" rx="15" ry="21" fill="#c2410c"/>
  <ellipse cx="32" cy="38" rx="15" ry="23" fill="#f97316"/>
  <polygon points="19,34 28,34 23.5,26" fill="#fde047"/>
  <polygon points="36,34 45,34 40.5,26" fill="#fde047"/>
  <path d="M18 42 L23 46 L27 43 L32 47 L37 43 L41 46 L46 42 Q44 53 32 54 Q20 53 18 42 Z" fill="#fde047"/>
</svg>`;

const pumpkinIcon = L.divIcon({
  html: PUMPKIN_SVG,
  className: 'pumpkin-pin',
  iconSize: [40, 40],
  iconAnchor: [20, 38],
});

interface MapViewProps {
  lat: number;
  lng: number;
  zoom: number;
}

// A simple map centered on the property's coordinates at a reasonable zoom, with a pin
// marking where the property is.
export function MapView({ lat, lng, zoom }: MapViewProps) {
  const halloween = useHalloween();
  return (
    <div className="overflow-hidden rounded-lg border border-white/10">
      <MapContainer
        key={`${lat},${lng}`}
        center={[lat, lng]}
        zoom={zoom}
        scrollWheelZoom={true}
        style={{ height: '240px', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[lat, lng]} icon={halloween ? pumpkinIcon : pinIcon} />
      </MapContainer>
    </div>
  );
}
