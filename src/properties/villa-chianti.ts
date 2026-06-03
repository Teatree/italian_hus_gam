import type { PropertyConfig } from '../types';

// Active-house data lives here. Edit the images order, facts order, coordinates and price
// to configure how this property plays. Images are served from
// public/properties/villa-chianti/<filename>.
export const villaChianti: PropertyConfig = {
  slug: 'villa-chianti',
  coordinates: { lat: 43.5836, lng: 11.3158 }, // Greve in Chianti
  mapZoom: 12,
  images: ['photo-1.png', 'photo-2.png', 'photo-3.png', 'photo-4.png', 'photo-5.png', 'photo-6.png'],
  facts: [
    'Located in Greve in Chianti, Toscana',
    '240 m² of living space',
    '4 bed / 3 bath',
    'Built in 1968',
    'Lot size: 3,200 m²',
    'Sold in May 2023',
  ],
  soldPrice: 685000,
};
