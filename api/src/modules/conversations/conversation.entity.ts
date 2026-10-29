import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { Listing } from '../listings/listing.entity';
import { User } from '../users/user.entity';

@Entity('conversations')
@Unique(['listingId', 'tenantId'])
export class Conversation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', name: 'listing_id' })
  listingId: number;

  @ManyToOne(() => Listing)
  @JoinColumn({ name: 'listing_id' })
  listing: Listing;

  @Column({ type: 'int', name: 'tenant_id' })
  tenantId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'tenant_id' })
  tenant: User;

  @Column({ type: 'int', name: 'owner_id' })
  ownerId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'owner_id' })
  owner: User;

  @OneToMany(() => Message, (m) => m.conversation)
  messages: Message[];

  @Column({ type: 'varchar', name: 'created_at' }) createdAt: string;
  @Column({ type: 'varchar', name: 'updated_at' }) updatedAt: string;
}

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', name: 'conversation_id' })
  conversationId: number;

  @ManyToOne(() => Conversation, (c) => c.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversation_id' })
  conversation: Conversation;

  @Column({ type: 'int', name: 'sender_id' })
  senderId: number;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'varchar', name: 'created_at' })
  createdAt: string;

  @Column({ type: 'varchar', name: 'read_at', nullable: true })
  readAt: string | null;
}
