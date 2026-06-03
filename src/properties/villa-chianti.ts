import type { PropertyConfig } from '../types';

// Active-house data lives here. Edit the images order, facts order, coordinates and price
// to configure how this property plays. Images are served from
// public/properties/villa-chianti/<filename>.
export const villaChianti: PropertyConfig = {
  slug: 'villa-chianti',
  coordinates: { lat: 43.7339, lng: 11.21986 }, 
  mapZoom: 12,
  images: ['photo-1.png', 'photo-2.png', 'photo-3.png', 'photo-4.png', 'photo-5.png', 'photo-6.png'],
  facts: [
    'Located in Greve in Galluzzo, Florence',
    '195 m² of living space',
    '7 rooms / 2 baths',
    'Built in 1976',
	'...wooden floors',
    '"Private Garden"',
  ],
  soldPrice: 590000,
  propertyUrl: 'https://www.idealista.it/en/immobile/35736501/',
};
