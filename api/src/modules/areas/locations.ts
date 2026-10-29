import { BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { nowIso } from '../../common/util';
import { Area } from './area.entity';

const PLACE_NAME = /^\p{L}[\p{L}\p{N} .'’&-]{1,59}$/u;

/** "port harcourt" → "Port Harcourt". Names are shown to every renter, so keep them tidy. */
export function tidyPlace(raw: string, label: string): string {
  const name = raw.trim().replace(/\s+/g, ' ');
  if (!PLACE_NAME.test(name)) throw new BadRequestException(`Enter a valid ${label} (letters, numbers, spaces, - and ' only)`);
  return name.replace(/(^|[\s-])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase());
}

export const slugify = (v: string) => v.trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '');

/**
 * Finds a neighbourhood by city and name (ignoring case), creating it when it's new.
 * Created areas have no ratings ("No data") until residents report on them.
 */
export async function findOrCreateArea(areas: Repository<Area>, cityRaw: string, neighbourhoodRaw: string): Promise<Area> {
  const city = tidyPlace(cityRaw, 'city');
  const name = tidyPlace(neighbourhoodRaw, 'neighbourhood');
  const existing = await areas
    .createQueryBuilder('a')
    .where('LOWER(a.city) = LOWER(:city) AND LOWER(a.name) = LOWER(:name)', { city, name })
    .getOne();
  if (existing) return existing;
  // Legacy Lagos areas use the bare name as slug ("yaba"); everything else is prefixed with its city.
  const slug = `${slugify(city)}-${slugify(name)}`;
  const bySlug = await areas.findOneBy({ slug });
  if (bySlug) return bySlug;
  return areas.save(areas.create({ slug, name, city, description: '', updatedAt: nowIso() }));
}
