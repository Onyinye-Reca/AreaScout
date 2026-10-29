import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { nowIso } from '../../common/util';
import { Area } from '../areas/area.entity';
import { slugify } from '../areas/areas.service';
import { findOrCreateArea } from '../areas/locations';
import { Conversation } from '../conversations/conversation.entity';
import { SavedListing } from '../saved/saved-listing.entity';
import { ListerReviewsService } from '../lister-reviews/lister-reviews.service';
import { User } from '../users/user.entity';
import { AdminListingDto, CreateListingDto, SearchListingsDto, UpdateListingDto } from './dto/listing.dto';
import { Listing } from './listing.entity';

/** A listing needs this many photos before it can be submitted for review. */
export const MIN_PHOTOS = 5;

/** Rent plus every up-front charge a tenant pays before moving in. */
export const moveInTotal = (l: Listing): number =>
  l.rent + l.agencyFee + l.legalFee + l.cautionDeposit + l.serviceCharge + l.utilities;

export function toListingView(l: Listing) {
  return {
    id: l.id,
    owner_id: l.ownerId,
    area_id: l.areaId,
    title: l.title,
    description: l.description,
    address: l.address,
    property_type: l.propertyType,
    bedrooms: l.bedrooms,
    bathrooms: l.bathrooms,
    rent: l.rent,
    rent_period: l.rentPeriod,
    agency_fee: l.agencyFee,
    legal_fee: l.legalFee,
    caution_deposit: l.cautionDeposit,
    service_charge: l.serviceCharge,
    utilities: l.utilities,
    features: l.features ?? [],
    photos: l.photos ?? [],
    verified: l.verified,
    status: l.status,
    created_at: l.createdAt,
    updated_at: l.updatedAt,
    area: l.area?.name,
    area_slug: l.area?.slug,
    city: l.area?.city,
    owner_name: l.owner?.name,
    owner_verified: l.owner?.verified ?? false,
    move_in_total: moveInTotal(l),
  };
}

@Injectable()
export class ListingsService {
  constructor(
    @InjectRepository(Listing) private readonly listings: Repository<Listing>,
    @InjectRepository(Area) private readonly areas: Repository<Area>,
    @InjectRepository(SavedListing) private readonly saved: Repository<SavedListing>,
    @InjectRepository(Conversation) private readonly conversations: Repository<Conversation>,
    private readonly listerReviews: ListerReviewsService,
  ) {}

  async search(q: SearchListingsDto) {
    const qb = this.listings
      .createQueryBuilder('l')
      .innerJoinAndSelect('l.area', 'a')
      .innerJoinAndSelect('l.owner', 'o')
      .where("l.status = 'live'");
    if (q.area) qb.andWhere('a.slug = :area', { area: slugify(q.area) });
    if (q.city) qb.andWhere('LOWER(a.city) = LOWER(:city)', { city: q.city });
    if (q.type) qb.andWhere('l.propertyType = :type', { type: q.type });
    if (q.beds != null) qb.andWhere('l.bedrooms >= :beds', { beds: q.beds });
    if (q.min_rent != null) qb.andWhere('l.rent >= :min', { min: q.min_rent });
    if (q.max_rent != null) qb.andWhere('l.rent <= :max', { max: q.max_rent });
    if (q.verified) qb.andWhere('l.verified = :v', { v: q.verified === '1' || q.verified === 'true' });
    if (q.q) {
      qb.andWhere('(LOWER(l.title) LIKE :q OR LOWER(l.address) LIKE :q OR LOWER(a.name) LIKE :q)', {
        q: `%${q.q.toLowerCase()}%`,
      });
    }
    const rows = await qb.orderBy('l.verified', 'DESC').addOrderBy('l.createdAt', 'DESC').take(100).getMany();
    return { listings: rows.map(toListingView) };
  }

  /** Live listings are public; anything else is visible to its owner and admins. */
  async get(id: number, viewer?: User) {
    const l = await this.load(id);
    const canSee = l.status === 'live' || (viewer && (viewer.id === l.ownerId || viewer.role === 'admin'));
    if (!canSee) throw new NotFoundException('Listing not found');
    // Owners and admins looking at a listing shouldn't inflate its numbers.
    if (l.status === 'live' && viewer?.id !== l.ownerId && viewer?.role !== 'admin') {
      await this.listings.increment({ id }, 'viewCount', 1);
    }
    const rating = await this.listerReviews.summary(l.ownerId);
    // The lister's number is for signed-in renters only: it keeps scrapers out but lets people call before they visit.
    const phone = viewer && viewer.id !== l.ownerId && l.owner?.phone ? l.owner.phone : null;
    return { listing: { ...toListingView(l), owner_rating: rating, owner_phone: phone } };
  }

  async mine(user: User) {
    const rows = await this.listings.find({
      where: { ownerId: user.id },
      relations: { area: true, owner: true },
      order: { updatedAt: 'DESC' },
    });
    const ids = rows.map((l) => l.id);
    const count = async (repo: Repository<SavedListing> | Repository<Conversation>) =>
      new Map(
        (ids.length
          ? await repo.createQueryBuilder('x').select('x.listingId', 'id').addSelect('COUNT(*)', 'n').where('x.listingId IN (:...ids)', { ids }).groupBy('x.listingId').getRawMany<{ id: number; n: string }>()
          : []
        ).map((r) => [Number(r.id), Number(r.n)]),
      );
    const [saves, inquiries] = await Promise.all([count(this.saved), count(this.conversations)]);
    return {
      listings: rows.map((l) => ({
        ...toListingView(l),
        stats: { views: l.viewCount, saves: saves.get(l.id) ?? 0, inquiries: inquiries.get(l.id) ?? 0 },
      })),
    };
  }

  async create(user: User, dto: CreateListingDto) {
    const area = await this.resolveArea(dto);
    if (!dto.draft && dto.photos.length < MIN_PHOTOS) {
      throw new BadRequestException(`Add at least ${MIN_PHOTOS} photos before submitting`);
    }
    const { area: _slug, city: _city, neighbourhood: _hood, draft, property_type, rent_period, agency_fee, legal_fee, caution_deposit, service_charge, ...rest } = dto;
    const saved = await this.listings.save(
      this.listings.create({
        ...rest,
        propertyType: property_type,
        rentPeriod: rent_period,
        agencyFee: agency_fee,
        legalFee: legal_fee,
        cautionDeposit: caution_deposit,
        serviceCharge: service_charge,
        ownerId: user.id,
        areaId: area.id,
        verified: false,
        status: draft ? 'draft' : 'pending',
        createdAt: nowIso(),
        updatedAt: nowIso(),
      }),
    );
    return {
      listing_id: saved.id,
      status: saved.status,
      message: draft ? 'Draft saved' : 'Submitted for admin verification',
    };
  }

  async update(user: User, id: number, dto: UpdateListingDto) {
    const l = await this.requireOwnerOrAdmin(user, id);
    const { property_type, agency_fee, legal_fee, caution_deposit, service_charge, area, city, neighbourhood, draft, ...rest } = dto;
    const changes: Partial<Listing> = {
      ...rest,
      ...(property_type !== undefined && { propertyType: property_type }),
      ...(agency_fee !== undefined && { agencyFee: agency_fee }),
      ...(legal_fee !== undefined && { legalFee: legal_fee }),
      ...(caution_deposit !== undefined && { cautionDeposit: caution_deposit }),
      ...(service_charge !== undefined && { serviceCharge: service_charge }),
    };
    if (area !== undefined || city !== undefined || neighbourhood !== undefined) {
      const found = await this.resolveArea({ area, city, neighbourhood });
      // The loaded relation wins over the FK column on save, so replace both.
      changes.areaId = found.id;
      changes.area = found;
    }
    if (!Object.keys(changes).length && draft === undefined) {
      throw new BadRequestException('No editable fields supplied');
    }
    if (draft && l.status !== 'draft') {
      throw new BadRequestException('Only drafts can be saved as drafts');
    }
    Object.assign(l, changes);
    if (!draft && l.photos.length < MIN_PHOTOS) {
      throw new BadRequestException(`Add at least ${MIN_PHOTOS} photos before submitting`);
    }
    Object.assign(l, { status: draft ? 'draft' : 'pending', verified: false, updatedAt: nowIso() });
    await this.listings.save(l);
    return { status: l.status };
  }

  async moderate(id: number, dto: AdminListingDto) {
    const l = await this.load(id);
    l.status = dto.status;
    l.verified = dto.status === 'live';
    l.updatedAt = nowIso();
    await this.listings.save(l);
    return { status: l.status };
  }

  async remove(user: User, id: number) {
    const l = await this.requireOwnerOrAdmin(user, id);
    l.status = 'removed';
    l.updatedAt = nowIso();
    await this.listings.save(l);
    return { status: 'removed' };
  }

  /** An existing area by slug, or a city + neighbourhood that is created when it's new. */
  private async resolveArea(p: { area?: string; city?: string; neighbourhood?: string }): Promise<Area> {
    if (p.city && p.neighbourhood) return findOrCreateArea(this.areas, p.city, p.neighbourhood);
    const found = p.area ? await this.areas.findOneBy({ slug: slugify(p.area) }) : null;
    if (!found) throw new BadRequestException('Choose a city and neighbourhood');
    return found;
  }

  private async load(id: number): Promise<Listing> {
    const l = await this.listings.findOne({ where: { id }, relations: { area: true, owner: true } });
    if (!l) throw new NotFoundException('Listing not found');
    return l;
  }

  private async requireOwnerOrAdmin(user: User, id: number): Promise<Listing> {
    const l = await this.load(id);
    if (user.role !== 'admin' && user.id !== l.ownerId) {
      throw new ForbiddenException('Only the listing owner or an admin can change this listing');
    }
    return l;
  }
}
