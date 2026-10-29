import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AreaReview } from '../areas/area-review.entity';
import { Listing } from '../listings/listing.entity';
import { toListingView } from '../listings/listings.service';
import { ListingReport } from '../reports/listing-report.entity';
import { ReportsService } from '../reports/reports.service';
import { User } from '../users/user.entity';
import { ModerateReviewDto, UpdateUserDto } from './dto/admin.dto';

/** A listing asking this far below comparable live listings is flagged for a closer look. */
const LOW_PRICE_RATIO = 0.5;
const MIN_COMPARABLES = 2;
const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Listing) private readonly listings: Repository<Listing>,
    @InjectRepository(AreaReview) private readonly reviews: Repository<AreaReview>,
    @InjectRepository(ListingReport) private readonly reports: Repository<ListingReport>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly reportService: ReportsService,
  ) {}

  async dashboard() {
    const groups = await this.reportService.groups();
    const [pendingListings, liveListings, pendingReviews, users, resolved] = await Promise.all([
      this.listings.countBy({ status: 'pending', hiddenByReports: false }),
      this.listings.countBy({ status: 'live' }),
      this.reviews.countBy({ status: 'pending' }),
      this.users.count(),
      this.reportService.resolvedSince(7),
    ]);
    return {
      open_reports: groups.reduce((n, g) => n + g.report_count, 0),
      urgent_reports: groups.filter((g) => g.urgent).length,
      pending_listings: pendingListings,
      live_listings: liveListings,
      pending_area_reviews: pendingReviews,
      resolved_this_week: resolved,
      users,
    };
  }

  /** Submitted listings, each with the reasons (if any) it deserves extra scrutiny. */
  async pendingListings() {
    const rows = await this.listings.find({
      where: { status: 'pending', hiddenByReports: false },
      relations: { area: true, owner: true },
      order: { updatedAt: 'ASC' },
    });
    const live = await this.listings.findBy({ status: 'live' });
    const others = await this.listings.findBy({ status: In(['live', 'pending']) });

    return {
      listings: rows.map((l) => {
        const flags: { type: 'duplicate' | 'low_price'; detail: string }[] = [];
        const dup = others.find((o) => o.id !== l.id && normalise(o.address) === normalise(l.address));
        if (dup) flags.push({ type: 'duplicate', detail: `Possible duplicate of #${dup.id}` });
        const comps = live.filter((o) => o.id !== l.id && o.areaId === l.areaId && o.propertyType === l.propertyType && o.rent > 0);
        if (comps.length >= MIN_COMPARABLES) {
          const avg = comps.reduce((n, o) => n + o.rent, 0) / comps.length;
          if (l.rent <= avg * LOW_PRICE_RATIO) flags.push({ type: 'low_price', detail: `Price ${Math.round((1 - l.rent / avg) * 100)}% below area average` });
        }
        return { ...toListingView(l), flags };
      }),
    };
  }

  async pendingReviews() {
    const rows = await this.reviews.find({
      where: { status: 'pending' },
      relations: { area: true, user: true },
      order: { createdAt: 'ASC' },
    });
    return {
      area_reviews: rows.map((r) => ({
        id: r.id,
        area: r.area.name,
        reviewer: r.user.name,
        power: r.power,
        flooding: r.flooding,
        security: r.security,
        water: r.water,
        transport: r.transport,
        internet: r.internet,
        comment: r.comment,
        created_at: r.createdAt,
      })),
    };
  }

  async moderateReview(id: number, dto: ModerateReviewDto) {
    const r = await this.reviews.findOneBy({ id });
    if (!r) throw new NotFoundException('Area report not found');
    r.status = dto.status;
    await this.reviews.save(r);
    return { status: r.status };
  }

  async listUsers(q?: string, role?: string) {
    const qb = this.users.createQueryBuilder('u').orderBy('u.createdAt', 'DESC').take(200);
    if (role) qb.andWhere('u.role = :role', { role });
    // LIKE is case-sensitive on Postgres but not SQLite, so lower both sides.
    if (q) qb.andWhere('(LOWER(u.name) LIKE :q OR LOWER(u.email) LIKE :q)', { q: `%${q.toLowerCase()}%` });
    const rows = await qb.getMany();
    const counts = await this.listings
      .createQueryBuilder('l')
      .select('l.ownerId', 'ownerId')
      .addSelect('COUNT(*)', 'n')
      .where('l.status IN (:...s)', { s: ['live', 'pending'] })
      .groupBy('l.ownerId')
      .getRawMany<{ ownerId: number; n: string }>();
    const byOwner = new Map(counts.map((c) => [Number(c.ownerId), Number(c.n)]));
    return {
      users: rows.map((u) => ({
        id: u.id, name: u.name, email: u.email, role: u.role, verified: u.verified, suspended: u.suspended,
        created_at: u.createdAt, listing_count: byOwner.get(u.id) ?? 0,
      })),
    };
  }

  async updateUser(adminId: number, id: number, dto: UpdateUserDto) {
    const u = await this.users.findOneBy({ id });
    if (!u) throw new NotFoundException('User not found');
    if (u.role === 'admin' || u.id === adminId) throw new BadRequestException('Admin accounts can’t be changed here');
    if (dto.verified !== undefined) await this.users.update(id, { verified: dto.verified });
    if (dto.suspended === true && !u.suspended) await this.reportService.suspendOwner(u);
    if (dto.suspended === false) await this.users.update(id, { suspended: false });
    const fresh = await this.users.findOneByOrFail({ id });
    return { verified: fresh.verified, suspended: fresh.suspended };
  }
}
