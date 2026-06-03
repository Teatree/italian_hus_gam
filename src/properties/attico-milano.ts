import type { PropertyConfig } from '../types';

export const atticoMilano: PropertyConfig = {
  slug: 'attico-milano',
  coordinates: { lat: 45.4642, lng: 9.19 }, // Milano centro
  mapZoom: 12,
  images: ['photo-1.png', 'photo-2.png', 'photo-3.png', 'photo-4.png', 'photo-5.png', 'photo-6.png'],
  facts: [
    'Located in Milano, Lombardia',
    '3 bed / 2 bath',
    '135 m² of living space',
    'Built in 2009',
    'Sold in November 2023',
    'No private lot (apartment)',
  ],
  soldPrice: 1250000,
  propertyUrl: 'https://www.immobiliare.it/',
};
