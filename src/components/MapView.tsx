import { MapContainer, TileLayer } from 'react-leaflet';

interface MapViewProps {
  lat: number;
  lng: number;
  zoom: number;
}

// A simple map centered on the property's coordinates at a reasonable zoom. No marker is
// drawn, so it shows the rough area without pinpointing the exact house.
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
      </MapContainer>
    </div>
  );
}
