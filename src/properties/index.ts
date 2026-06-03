import type { PropertyConfig } from '../types';
import { villaChianti } from './villa-chianti';
import { atticoMilano } from './attico-milano';
import { trulloPuglia } from './trullo-puglia';

// Registry of every available property, keyed by slug. Add new properties here after
// creating their config file and image folder under public/properties/<slug>.
export const properties: Record<string, PropertyConfig> = {
  [villaChianti.slug]: villaChianti,
  [atticoMilano.slug]: atticoMilano,
  [trulloPuglia.slug]: trulloPuglia,
};
