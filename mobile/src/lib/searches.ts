import { naira } from './format';
import type { SavedSearch } from './types';

/** "Abuja · 2+ bedrooms · under ₦3,000,000" — how a saved search is described to the user. */
export const summarise = (f: SavedSearch['filters']): string =>
  [f.city, f.q && `“${f.q}”`, f.type, f.beds ? `${f.beds}+ bedrooms` : null, f.max_rent ? `under ${naira(f.max_rent)}` : null, f.min_rent ? `from ${naira(f.min_rent)}` : null, f.verified ? 'verified only' : null]
    .filter(Boolean)
    .join(' · ');
