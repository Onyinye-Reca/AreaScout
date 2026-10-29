import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { nowIso } from '../../common/util';
import { Listing } from '../listings/listing.entity';
import { User } from '../users/user.entity';
import { AreaReview } from './area-review.entity';
import { Area } from './area.entity';
import { CreateAreaReviewDto } from './dto/area.dto';

const FIELDS = ['power', 'flooding', 'security', 'water', 'transport', 'internet'] as const;
const round1 = (n: number) => Math.round(n * 10) / 10;

export { slugify } from './locations';
import { slugify } from './locations';

@Injectable()
export class AreasService {
  constructor(
    @InjectRepository(Area) private readonly areas: Repository<Area>,
    @InjectRepository(AreaReview) private readonly reviews: Repository<AreaReview>,
    @InjectRepository(Listing) private readonly listings: Repository<Listing>,
  ) {}

  /** Area plus community averages. Only published reviews count towards them. */
  async summarise(area: Area) {
    const published = await this.reviews.findBy({ areaId: area.id, status: 'published' });
    const averages: Record<string, number> = {};
    for (const field of FIELDS) {
      const values = published.map((r) => r[field]).filter((v): v is number => v != null);
      if (values.length) averages[field] = round1(values.reduce((a, b) => a + b, 0) / values.length);
    }
    const rated = Object.values(averages);
    const score = rated.length
      ? Math.round((rated.reduce((a, b) => a + b, 0) / rated.length) * 20)
      : area.score;
    const listingCount = await this.listings.countBy({ areaId: area.id, status: 'live' });
    return {
      id: area.id,
      slug: area.slug,
      name: area.name,
      city: area.city,
      description: area.description,
      power: area.power,
      flooding: area.flooding,
      security: area.security,
      water: area.water,
      transport: area.transport,
      internet: area.internet,
      score,
      listing_count: listingCount,
      community_reports: published.length,
      rating_averages: averages,
      updated_at: area.updatedAt,
    };
  }

  /** Cities that have neighbourhoods, with how many live homes each has. Busiest first. */
  async locations() {
    const areas = await this.areas.find();
    const live = await this.listings
      .createQueryBuilder('l')
      .select('l.areaId', 'areaId')
      .addSelect('COUNT(*)', 'n')
      .where("l.status = 'live'")
      .groupBy('l.areaId')
      .getRawMany<{ areaId: number; n: string }>();
    const byArea = new Map(live.map((r) => [Number(r.areaId), Number(r.n)]));
    const cities = new Map<string, { city: string; area_count: number; listing_count: number }>();
    for (const a of areas) {
      const key = a.city.toLowerCase();
      const c = cities.get(key) ?? { city: a.city, area_count: 0, listing_count: 0 };
      c.area_count++;
      c.listing_count += byArea.get(a.id) ?? 0;
      cities.set(key, c);
    }
    return { cities: [...cities.values()].sort((a, b) => b.listing_count - a.listing_count || a.city.localeCompare(b.city)) };
  }

  async list(city?: string) {
    const areas = await this.areas
      .createQueryBuilder('a')
      .where(city ? 'LOWER(a.city) = LOWER(:city)' : '1=1', { city })
      .orderBy('a.name', 'ASC')
      .getMany();
    return { areas: await Promise.all(areas.map((a) => this.summarise(a))) };
  }

  async get(slug: string) {
    const area = await this.areas.findOneBy({ slug });
    if (!area) throw new NotFoundException('Area not found');
    const reviews = await this.reviews.find({
      where: { areaId: area.id, status: 'published' },
      relations: { user: true },
      order: { createdAt: 'DESC' },
      take: 100,
    });
    return {
      area: await this.summarise(area),
      reviews: reviews.map((r) => ({
        id: r.id,
        power: r.power,
        flooding: r.flooding,
        security: r.security,
        water: r.water,
        transport: r.transport,
        internet: r.internet,
        comment: r.comment,
        created_at: r.createdAt,
        reviewer: r.user.name,
      })),
    };
  }

  async createReview(user: User, dto: CreateAreaReviewDto) {
    const area = await this.areas.findOneBy({ slug: slugify(dto.area) });
    if (!area) throw new BadRequestException('Choose a supported area');
    const { area: _slug, ...ratings } = dto;
    const saved = await this.reviews.save(
      this.reviews.create({
        ...ratings,
        power: dto.power ?? null,
        flooding: dto.flooding ?? null,
        security: dto.security ?? null,
        water: dto.water ?? null,
        transport: dto.transport ?? null,
        internet: dto.internet ?? null,
        areaId: area.id,
        userId: user.id,
        status: 'pending',
        createdAt: nowIso(),
      }),
    );
    return { review_id: saved.id, status: 'pending', message: 'Thanks — your report will appear after a quick check' };
  }
}
