import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Conversation, Message } from '../conversations/conversation.entity';
import { Inspection } from '../inspections/inspection.entity';
import { Listing } from '../listings/listing.entity';
import { User } from '../users/user.entity';

const WEEK_MS = 7 * 86_400_000;

@Injectable()
export class OwnerService {
  constructor(
    @InjectRepository(Listing) private readonly listings: Repository<Listing>,
    @InjectRepository(Inspection) private readonly inspections: Repository<Inspection>,
    @InjectRepository(Conversation) private readonly conversations: Repository<Conversation>,
    @InjectRepository(Message) private readonly messages: Repository<Message>,
  ) {}

  /** Counts behind the landlord dashboard's tiles and "needs your attention" list. */
  async dashboard(user: User) {
    const [live, pendingReview, drafts] = await Promise.all(
      (['live', 'pending', 'draft'] as const).map((status) => this.listings.countBy({ ownerId: user.id, status })),
    );
    const pendingInspections = await this.inspections.countBy({ ownerId: user.id, status: 'pending' });
    const now = Date.now();
    const upcoming = await this.inspections.countBy({
      ownerId: user.id,
      status: 'confirmed',
      requestedAt: Between(new Date(now).toISOString(), new Date(now + WEEK_MS).toISOString()),
    });

    // A conversation is unanswered when the latest message came from the tenant.
    const convos = await this.conversations.findBy({ ownerId: user.id });
    let unanswered = 0;
    let oldest: string | null = null;
    for (const c of convos) {
      const last = await this.messages.findOne({ where: { conversationId: c.id }, order: { id: 'DESC' } });
      if (last && last.senderId !== user.id) {
        unanswered++;
        if (!oldest || last.createdAt < oldest) oldest = last.createdAt;
      }
    }
    return {
      live_listings: live,
      pending_review: pendingReview,
      drafts,
      pending_inspections: pendingInspections,
      upcoming_inspections: upcoming,
      unanswered_messages: unanswered,
      oldest_unanswered_at: oldest,
    };
  }
}
