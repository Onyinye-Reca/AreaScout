import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { nowIso } from '../../common/util';
import { Listing } from '../listings/listing.entity';
import { User } from '../users/user.entity';
import { Conversation, Message } from './conversation.entity';

const messageView = (m: Message) => ({
  id: m.id,
  sender_id: m.senderId,
  body: m.body,
  created_at: m.createdAt,
  read_at: m.readAt,
});

@Injectable()
export class ConversationsService {
  constructor(
    @InjectRepository(Conversation) private readonly conversations: Repository<Conversation>,
    @InjectRepository(Message) private readonly messages: Repository<Message>,
    @InjectRepository(Listing) private readonly listings: Repository<Listing>,
  ) {}

  async start(user: User, listingId: number, text: string) {
    const listing = await this.listings.findOneBy({ id: listingId, status: 'live' });
    if (!listing) throw new NotFoundException('Listing not found');
    let convo = await this.conversations.findOneBy({ listingId, tenantId: user.id });
    if (!convo) {
      convo = await this.conversations.save(
        this.conversations.create({
          listingId,
          tenantId: user.id,
          ownerId: listing.ownerId,
          createdAt: nowIso(),
          updatedAt: nowIso(),
        }),
      );
    }
    await this.append(convo, user.id, text);
    return { conversation_id: convo.id };
  }

  async list(user: User) {
    const rows = await this.conversations.find({
      where: user.role === 'admin' ? {} : [{ tenantId: user.id }, { ownerId: user.id }],
      relations: { listing: true, tenant: true, owner: true },
      order: { updatedAt: 'DESC' },
    });
    const out = [];
    for (const c of rows) {
      const last = await this.messages.findOne({ where: { conversationId: c.id }, order: { id: 'DESC' } });
      const unread = await this.messages.count({
        where: { conversationId: c.id, readAt: IsNull(), senderId: Not(user.id) },
      });
      out.push({
        id: c.id,
        listing_id: c.listingId,
        listing_title: c.listing.title,
        with: user.id === c.tenantId ? c.owner.name : c.tenant.name,
        last_message: last?.body ?? '',
        unread,
        updated_at: c.updatedAt,
      });
    }
    return { conversations: out };
  }

  async get(user: User, id: number) {
    const c = await this.participantConversation(user, id);
    await this.messages.update(
      { conversationId: id, readAt: IsNull(), senderId: Not(user.id) },
      { readAt: nowIso() },
    );
    const messages = await this.messages.find({ where: { conversationId: id }, order: { id: 'ASC' } });
    return {
      conversation: { id: c.id, listing_id: c.listingId, listing_title: c.listing.title },
      messages: messages.map(messageView),
    };
  }

  async send(user: User, id: number, text: string) {
    const c = await this.participantConversation(user, id);
    return { message: messageView(await this.append(c, user.id, text)) };
  }

  private async append(c: Conversation, senderId: number, body: string): Promise<Message> {
    const now = nowIso();
    const m = await this.messages.save(
      this.messages.create({ conversationId: c.id, senderId, body, createdAt: now, readAt: null }),
    );
    await this.conversations.update(c.id, { updatedAt: now });
    return m;
  }

  private async participantConversation(user: User, id: number): Promise<Conversation> {
    const c = await this.conversations.findOne({ where: { id }, relations: { listing: true } });
    if (!c) throw new NotFoundException('Conversation not found');
    if (user.id !== c.tenantId && user.id !== c.ownerId) {
      throw new ForbiddenException('You are not part of this conversation');
    }
    return c;
  }
}
