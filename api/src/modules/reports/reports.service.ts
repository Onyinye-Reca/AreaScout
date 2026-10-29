import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, MoreThanOrEqual, Not, Repository } from 'typeorm';
import { nowIso } from '../../common/util';
import { Listing } from '../listings/listing.entity';
import { User } from '../users/user.entity';
import { ReportListingDto, ResolveListingDto, UpdateReportDto } from './dto/report.dto';
import { ListingReport } from './listing-report.entity';

/** Distinct people who must report a live listing before it is pulled back into review. */
export const AUTO_HIDE_REPORTERS = 3;
const OPEN = ['open', 'reviewing'] as const;
const DAY_MS = 86_400_000;

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(ListingReport) private readonly reports: Repository<ListingReport>,
    @InjectRepository(Listing) private readonly listings: Repository<Listing>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async report(user: User, listingId: number, dto: ReportListingDto) {
    const listing = await this.listings.findOneBy({ id: listingId });
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.ownerId === user.id) throw new BadRequestException('You can’t report your own listing');

    const existing = await this.reports.findOneBy({ listingId, reporterId: user.id, status: In([...OPEN]) });
    if (existing) return { report_id: existing.id, status: existing.status };

    const saved = await this.reports.save(
      this.reports.create({ ...dto, listingId, reporterId: user.id, status: 'open', resolution: '', createdAt: nowIso(), updatedAt: nowIso() }),
    );
    // A single report can be malicious, so only several independent ones hide a listing.
    const reporters = new Set((await this.reports.findBy({ listingId, status: In([...OPEN]) })).map((r) => r.reporterId));
    if (reporters.size >= AUTO_HIDE_REPORTERS && listing.status === 'live') {
      Object.assign(listing, { status: 'pending', verified: false, hiddenByReports: true, updatedAt: nowIso() });
      await this.listings.save(listing);
    }
    return { report_id: saved.id, status: 'open' };
  }

  /** Open reports grouped per listing, most urgent first. */
  async groups() {
    const open = await this.reports.find({ where: { status: In([...OPEN]) }, relations: { listing: { owner: true } }, order: { createdAt: 'ASC' } });
    const byListing = new Map<number, ListingReport[]>();
    for (const r of open) byListing.set(r.listingId, [...(byListing.get(r.listingId) ?? []), r]);
    const out = await Promise.all([...byListing.values()].map((rows) => this.toGroup(rows)));
    return out.sort((a, b) => Number(b.urgent) - Number(a.urgent) || a.oldest_at.localeCompare(b.oldest_at));
  }

  async group(listingId: number) {
    const rows = await this.reports.find({ where: { listingId, status: In([...OPEN]) }, relations: { listing: { owner: true } }, order: { createdAt: 'ASC' } });
    if (!rows.length) throw new NotFoundException('No open reports for this listing');
    return this.toGroup(rows);
  }

  private async toGroup(rows: ListingReport[]) {
    const listing = rows[0].listing;
    const owner = listing.owner;
    const ownerListings = await this.listings.findBy({ ownerId: owner.id, status: Not('draft') });
    const pastReports = await this.reports.count({ where: { listing: { ownerId: owner.id }, listingId: Not(listing.id) } });
    const reporters = new Set(rows.map((r) => r.reporterId)).size;
    return {
      listing_id: listing.id,
      listing_title: listing.title,
      rent: listing.rent,
      photo: listing.photos[0] ?? null,
      listing_status: listing.status,
      hidden_by_reports: listing.hiddenByReports,
      report_count: rows.length,
      reporters,
      oldest_at: rows[0].createdAt,
      urgent: rows.some((r) => r.reason === 'scam') || reporters >= AUTO_HIDE_REPORTERS,
      reasons: [...new Set(rows.map((r) => r.reason))],
      owner: {
        id: owner.id,
        name: owner.name,
        role: owner.role,
        verified: owner.verified,
        suspended: owner.suspended,
        account_age_days: Math.max(0, Math.floor((Date.now() - new Date(owner.createdAt).getTime()) / DAY_MS)),
        listing_count: ownerListings.filter((l) => l.status !== 'removed').length,
        past_reports: pastReports,
      },
      reports: rows.map((r) => ({ id: r.id, reason: r.reason, details: r.details, status: r.status, created_at: r.createdAt })),
    };
  }

  /** Per-report triage; the app resolves whole listings through `resolveListing` instead. */
  async resolve(id: number, dto: UpdateReportDto) {
    const r = await this.reports.findOneBy({ id });
    if (!r) throw new NotFoundException('Report not found');
    Object.assign(r, { status: dto.status, resolution: dto.resolution, updatedAt: nowIso() });
    await this.reports.save(r);
    return { status: r.status };
  }

  async resolveListing(listingId: number, dto: ResolveListingDto) {
    const listing = await this.listings.findOne({ where: { id: listingId }, relations: { owner: true } });
    if (!listing) throw new NotFoundException('Listing not found');
    const open = await this.reports.findBy({ listingId, status: In([...OPEN]) });
    if (!open.length) throw new NotFoundException('No open reports for this listing');
    const now = nowIso();
    let reportStatus: 'resolved' | 'dismissed' | 'reviewing' = 'resolved';

    switch (dto.action) {
      case 'remove_and_suspend': {
        if (listing.owner.role === 'admin') throw new BadRequestException('Admin accounts can’t be suspended');
        await this.suspendOwner(listing.owner);
        break;
      }
      case 'remove':
        await this.listings.update(listingId, { status: 'removed', verified: false, hiddenByReports: false, updatedAt: now });
        break;
      case 'request_info':
        // Stays hidden (back in review) while the lister responds.
        await this.listings.update(listingId, { status: 'pending', verified: false, hiddenByReports: false, updatedAt: now });
        reportStatus = 'reviewing';
        break;
      case 'dismiss':
        reportStatus = 'dismissed';
        if (listing.hiddenByReports) await this.listings.update(listingId, { status: 'live', verified: true, hiddenByReports: false, updatedAt: now });
        break;
    }
    await this.reports.update({ id: In(open.map((r) => r.id)) }, { status: reportStatus, resolution: dto.note || dto.action, updatedAt: now });
    return { action: dto.action, reports: open.length };
  }

  /** Suspends an account and takes down everything it has listed. */
  async suspendOwner(owner: User): Promise<void> {
    await this.users.update(owner.id, { suspended: true });
    await this.listings.update({ ownerId: owner.id, status: In(['live', 'pending', 'rejected']) }, { status: 'removed', verified: false, hiddenByReports: false, updatedAt: nowIso() });
  }

  async resolvedSince(days: number): Promise<number> {
    return this.reports.countBy({ status: In(['resolved', 'dismissed']), updatedAt: MoreThanOrEqual(new Date(Date.now() - days * DAY_MS).toISOString()) });
  }
}
