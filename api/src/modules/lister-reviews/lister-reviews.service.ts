import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { nowIso } from '../../common/util';
import { Inspection } from '../inspections/inspection.entity';
import { User } from '../users/user.entity';
import { CreateListerReviewDto, ModerateListerReviewDto } from './dto/lister-review.dto';
import { ListerReview } from './lister-review.entity';

const round1 = (n: number) => Math.round(n * 10) / 10;

@Injectable()
export class ListerReviewsService {
  constructor(
    @InjectRepository(ListerReview) private readonly reviews: Repository<ListerReview>,
    @InjectRepository(Inspection) private readonly inspections: Repository<Inspection>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async create(user: User, dto: CreateListerReviewDto) {
    const inspection = await this.inspections.findOneBy({ id: dto.inspection_id });
    if (!inspection || inspection.tenantId !== user.id) throw new NotFoundException('Inspection not found');
    // Only people who actually met the lister can rate them.
    if (inspection.status !== 'confirmed' || new Date(inspection.requestedAt).getTime() > Date.now()) {
      throw new BadRequestException('You can rate after a confirmed inspection has taken place');
    }
    if (await this.reviews.existsBy({ inspectionId: inspection.id })) throw new ConflictException('You’ve already rated this inspection');
    const saved = await this.reviews.save(
      this.reviews.create({ ownerId: inspection.ownerId, tenantId: user.id, listingId: inspection.listingId, inspectionId: inspection.id, rating: dto.rating, comment: dto.comment, status: 'published', createdAt: nowIso() }),
    );
    return { review_id: saved.id };
  }

  /** Average and count over published reviews only. */
  async summary(ownerId: number): Promise<{ average: number | null; count: number }> {
    const rows = await this.reviews.findBy({ ownerId, status: 'published' });
    return { average: rows.length ? round1(rows.reduce((n, r) => n + r.rating, 0) / rows.length) : null, count: rows.length };
  }

  async forLister(ownerId: number) {
    if (!(await this.users.existsBy({ id: ownerId }))) throw new NotFoundException('Not found');
    const rows = await this.reviews.find({ where: { ownerId, status: 'published' }, relations: { tenant: true }, order: { createdAt: 'DESC' }, take: 20 });
    return {
      ...(await this.summary(ownerId)),
      reviews: rows.map((r) => ({ id: r.id, rating: r.rating, comment: r.comment, created_at: r.createdAt, reviewer: r.tenant.name.split(' ')[0] })),
    };
  }

  async reviewedInspectionIds(inspectionIds: number[]): Promise<Set<number>> {
    if (!inspectionIds.length) return new Set();
    const rows = await this.reviews.createQueryBuilder('r').select('r.inspectionId', 'id').where('r.inspectionId IN (:...ids)', { ids: inspectionIds }).getRawMany<{ id: number }>();
    return new Set(rows.map((r) => Number(r.id)));
  }

  async recentForAdmin() {
    const rows = await this.reviews.find({ relations: { tenant: true }, order: { createdAt: 'DESC' }, take: 100 });
    return { reviews: rows.map((r) => ({ id: r.id, owner_id: r.ownerId, rating: r.rating, comment: r.comment, status: r.status, reviewer: r.tenant.name, created_at: r.createdAt })) };
  }

  async moderate(id: number, dto: ModerateListerReviewDto, admin: User) {
    if (admin.role !== 'admin') throw new ForbiddenException();
    const r = await this.reviews.findOneBy({ id });
    if (!r) throw new NotFoundException('Review not found');
    r.status = dto.status;
    await this.reviews.save(r);
    return { status: r.status };
  }
}
