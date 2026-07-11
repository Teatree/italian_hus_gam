import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
// Leaflet's default marker icon resolves its image URLs relative to the stylesheet, which
// breaks under Vite's bundling — import the images explicitly so the pin shows up in prod.
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const pinIcon = new L.Icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  shadowSize: [41, 41],
});

interface MapViewProps {
  lat: number;
  lng: number;
  zoom: number;
}

// A simple map centered on the property's coordinates at a reasonable zoom, with a pin
// marking where the property is.
export function MapView({ lat, lng, zoom }: MapViewProps) {
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
        <Marker position={[lat, lng]} icon={pinIcon} />
      </MapContainer>
    </div>
  );
}
