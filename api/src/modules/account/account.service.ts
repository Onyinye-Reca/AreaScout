import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'node:crypto';
import { Not, Repository } from 'typeorm';
import { nowIso } from '../../common/util';
import { AreaReview } from '../areas/area-review.entity';
import { checkPassword, hashPassword, publicUser } from '../auth/auth.service';
import { Session } from '../auth/session.entity';
import { Conversation, Message } from '../conversations/conversation.entity';
import { Inspection } from '../inspections/inspection.entity';
import { Listing } from '../listings/listing.entity';
import { ListingsService } from '../listings/listings.service';
import { ListingReport } from '../reports/listing-report.entity';
import { SavedListing } from '../saved/saved-listing.entity';
import { User } from '../users/user.entity';
import { ChangePasswordDto, CreateSavedSearchDto, PreferencesDto, UpdateProfileDto, UpdateSavedSearchDto } from './dto/account.dto';
import { SavedSearch } from './saved-search.entity';

export const PREFERENCE_DEFAULTS = { inspection_updates: true, messages: true, saved_search_alerts: true, area_report_updates: true };

@Injectable()
export class AccountService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Session) private readonly sessions: Repository<Session>,
    @InjectRepository(SavedSearch) private readonly searches: Repository<SavedSearch>,
    @InjectRepository(SavedListing) private readonly saved: Repository<SavedListing>,
    @InjectRepository(Listing) private readonly listings: Repository<Listing>,
    @InjectRepository(Inspection) private readonly inspections: Repository<Inspection>,
    @InjectRepository(Conversation) private readonly conversations: Repository<Conversation>,
    @InjectRepository(Message) private readonly messages: Repository<Message>,
    @InjectRepository(AreaReview) private readonly reviews: Repository<AreaReview>,
    @InjectRepository(ListingReport) private readonly reports: Repository<ListingReport>,
    private readonly listingService: ListingsService,
  ) {}

  async updateProfile(user: User, dto: UpdateProfileDto) {
    await this.users.update(user.id, dto);
    return { user: publicUser({ ...user, ...dto }) };
  }

  async changePassword(user: User, currentTokenHash: string | undefined, dto: ChangePasswordDto) {
    const row = await this.withHash(user.id);
    if (!(await checkPassword(dto.current_password, row.passwordHash))) // 400, not 401: clients treat 401 as "session expired" and would sign the user out.
    throw new BadRequestException('Your current password is incorrect');
    await this.users.update(user.id, { passwordHash: await hashPassword(dto.new_password) });
    // Sign out everywhere else; this device stays signed in.
    await this.sessions.delete({ userId: user.id, ...(currentTokenHash ? { tokenHash: Not(currentTokenHash) } : {}) });
    return { ok: true };
  }

  preferences(user: User) {
    return { preferences: { ...PREFERENCE_DEFAULTS, ...user.notificationPrefs } };
  }

  async setPreferences(user: User, dto: PreferencesDto) {
    const next = { ...PREFERENCE_DEFAULTS, ...user.notificationPrefs, ...dto };
    await this.users.update(user.id, { notificationPrefs: next });
    return { preferences: next };
  }

  // ---- saved searches ----

  async listSearches(user: User) {
    const rows = await this.searches.find({ where: { userId: user.id }, order: { createdAt: 'DESC' } });
    return { searches: await Promise.all(rows.map((s) => this.searchView(s))) };
  }

  async createSearch(user: User, dto: CreateSavedSearchDto) {
    if ((await this.searches.countBy({ userId: user.id })) >= 20) throw new BadRequestException('You can keep up to 20 saved searches');
    const now = nowIso();
    const saved = await this.searches.save(this.searches.create({ userId: user.id, name: dto.name, filters: dto.filters, alerts: dto.alerts, createdAt: now, lastSeenAt: now }));
    return { search: await this.searchView(saved) };
  }

  async updateSearch(user: User, id: number, dto: UpdateSavedSearchDto) {
    const s = await this.ownSearch(user, id);
    Object.assign(s, dto);
    await this.searches.save(s);
    return { search: await this.searchView(s) };
  }

  /** Called when the user opens a saved search: whatever is there now is no longer "new". */
  async markSeen(user: User, id: number) {
    const s = await this.ownSearch(user, id);
    s.lastSeenAt = nowIso();
    await this.searches.save(s);
    return { search: await this.searchView(s) };
  }

  async deleteSearch(user: User, id: number) {
    await this.searches.remove(await this.ownSearch(user, id));
    return { deleted: true };
  }

  private async ownSearch(user: User, id: number): Promise<SavedSearch> {
    const s = await this.searches.findOneBy({ id, userId: user.id });
    if (!s) throw new NotFoundException('Saved search not found');
    return s;
  }

  private async searchView(s: SavedSearch) {
    const { listings } = await this.listingService.search(s.filters);
    return {
      id: s.id, name: s.name, filters: s.filters, alerts: s.alerts, created_at: s.createdAt,
      match_count: listings.length,
      new_count: listings.filter((l) => l.updated_at > s.lastSeenAt).length,
    };
  }

  // ---- privacy ----

  /** Everything the platform holds about this account, as one JSON document. */
  async exportData(user: User) {
    const mine = { where: [{ tenantId: user.id }, { ownerId: user.id }] };
    const convos = await this.conversations.find(mine);
    const convoIds = convos.map((c) => c.id);
    const messages = convoIds.length ? await this.messages.createQueryBuilder('m').where('m.conversationId IN (:...ids)', { ids: convoIds }).orderBy('m.id').getMany() : [];
    return {
      exported_at: nowIso(),
      account: { ...publicUser(user), created_at: user.createdAt, notification_preferences: { ...PREFERENCE_DEFAULTS, ...user.notificationPrefs } },
      saved_homes: (await this.saved.findBy({ userId: user.id })).map((x) => ({ listing_id: x.listingId, saved_at: x.createdAt })),
      saved_searches: (await this.searches.findBy({ userId: user.id })).map((s) => ({ name: s.name, filters: s.filters, alerts: s.alerts, created_at: s.createdAt })),
      listings: (await this.listings.findBy({ ownerId: user.id })).map((l) => ({ id: l.id, title: l.title, address: l.address, rent: l.rent, status: l.status, created_at: l.createdAt })),
      inspections: (await this.inspections.find(mine)).map((i) => ({ listing_id: i.listingId, requested_at: i.requestedAt, note: i.note, status: i.status, owner_note: i.ownerNote })),
      conversations: convos.map((c) => ({
        id: c.id, listing_id: c.listingId,
        messages: messages.filter((m) => m.conversationId === c.id).map((m) => ({ from_you: m.senderId === user.id, body: m.body, sent_at: m.createdAt })),
      })),
      area_reports: (await this.reviews.findBy({ userId: user.id })).map((r) => ({ area_id: r.areaId, comment: r.comment, status: r.status, created_at: r.createdAt })),
      listing_reports: (await this.reports.findBy({ reporterId: user.id })).map((r) => ({ listing_id: r.listingId, reason: r.reason, details: r.details, created_at: r.createdAt })),
    };
  }

  /**
   * Deletes personal data. Rows other people rely on (their conversations, inspections) stay,
   * but are detached from the person: name, email, phone and password are scrubbed.
   */
  async deleteAccount(user: User, password: string) {
    if (user.role === 'admin') throw new BadRequestException('Admin accounts can’t be deleted here');
    const row = await this.withHash(user.id);
    if (!(await checkPassword(password, row.passwordHash))) throw new BadRequestException('That password is incorrect');
    await this.sessions.delete({ userId: user.id });
    await this.saved.delete({ userId: user.id });
    await this.searches.delete({ userId: user.id });
    await this.listings.update({ ownerId: user.id }, { status: 'removed', verified: false, hiddenByReports: false, updatedAt: nowIso() });
    await this.users.update(user.id, {
      name: 'Deleted user',
      email: `deleted-${user.id}-${randomBytes(4).toString('hex')}@deleted.invalid`,
      phone: '',
      verified: false,
      suspended: true,
      notificationPrefs: {},
      passwordHash: await hashPassword(randomBytes(32).toString('base64url')),
    });
    return { deleted: true };
  }

  private async withHash(id: number): Promise<User> {
    return this.users.createQueryBuilder('u').addSelect('u.passwordHash').where('u.id = :id', { id }).getOneOrFail();
  }
}
