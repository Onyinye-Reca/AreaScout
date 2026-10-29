import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { nowIso } from '../../common/util';
import { ListerReviewsService } from '../lister-reviews/lister-reviews.service';
import { Listing } from '../listings/listing.entity';
import { User } from '../users/user.entity';
import { CreateInspectionDto, UpdateInspectionDto } from './dto/inspection.dto';
import { Inspection } from './inspection.entity';

const view = (i: Inspection) => ({
  id: i.id,
  listing_id: i.listingId,
  listing_title: i.listing?.title,
  tenant_id: i.tenantId,
  tenant_name: i.tenant?.name,
  owner_id: i.ownerId,
  requested_at: i.requestedAt,
  note: i.note,
  status: i.status,
  owner_note: i.ownerNote,
  created_at: i.createdAt,
  updated_at: i.updatedAt,
});

@Injectable()
export class InspectionsService {
  constructor(
    @InjectRepository(Inspection) private readonly inspections: Repository<Inspection>,
    @InjectRepository(Listing) private readonly listings: Repository<Listing>,
    private readonly listerReviews: ListerReviewsService,
  ) {}

  async create(user: User, dto: CreateInspectionDto) {
    if (new Date(dto.requested_at).getTime() <= Date.now()) {
      throw new BadRequestException('Choose a time in the future');
    }
    const listing = await this.listings.findOneBy({ id: dto.listing_id, status: 'live' });
    if (!listing) throw new NotFoundException('Listing not found');
    const saved = await this.inspections.save(
      this.inspections.create({
        listingId: listing.id,
        tenantId: user.id,
        ownerId: listing.ownerId,
        requestedAt: dto.requested_at,
        note: dto.note,
        status: 'pending',
        ownerNote: '',
        createdAt: nowIso(),
        updatedAt: nowIso(),
      }),
    );
    return { inspection_id: saved.id, status: 'pending' };
  }

  async list(user: User) {
    const where =
      user.role === 'admin' ? {} : user.role === 'tenant' ? { tenantId: user.id } : { ownerId: user.id };
    const rows = await this.inspections.find({
      where,
      relations: { listing: { owner: true }, tenant: true },
      order: { requestedAt: 'DESC' },
      take: 200,
    });
    const reviewed = await this.listerReviews.reviewedInspectionIds(rows.map((i) => i.id));
    return {
      inspections: rows.map((i) => ({
        ...view(i),
        owner_name: i.listing?.owner?.name,
        /** True once a confirmed visit is in the past and the renter hasn't rated it. */
        can_review: user.role === 'tenant' && i.status === 'confirmed' && new Date(i.requestedAt).getTime() <= Date.now() && !reviewed.has(i.id),
        reviewed: reviewed.has(i.id),
      })),
    };
  }

  async update(user: User, id: number, dto: UpdateInspectionDto) {
    const i = await this.inspections.findOneBy({ id });
    if (!i) throw new NotFoundException('Inspection not found');

    if (dto.status === 'cancelled') {
      if (i.tenantId !== user.id && user.role !== 'admin') {
        throw new ForbiddenException('Only the tenant who asked can cancel this request');
      }
    } else if (i.ownerId !== user.id && user.role !== 'admin') {
      throw new ForbiddenException('Only the listing owner can respond to this request');
    }
    if (dto.status === 'new_time') {
      if (!dto.requested_at) throw new BadRequestException('Suggest a new time');
      i.requestedAt = dto.requested_at;
    }
    i.status = dto.status;
    if (dto.owner_note !== undefined) i.ownerNote = dto.owner_note;
    i.updatedAt = nowIso();
    await this.inspections.save(i);
    return { status: i.status };
  }
}
