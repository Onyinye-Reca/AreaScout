import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Listing } from '../listings/listing.entity';
import { User } from '../users/user.entity';

export const INSPECTION_STATUSES = ['pending', 'confirmed', 'declined', 'new_time', 'cancelled'] as const;
export type InspectionStatus = (typeof INSPECTION_STATUSES)[number];

@Entity('inspections')
export class Inspection {
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

  /** RFC 3339, UTC. */
  @Column({ type: 'varchar', name: 'requested_at' })
  requestedAt: string;

  @Column({ type: 'text', default: '' })
  note: string;

  @Column({ type: 'varchar', default: 'pending' })
  status: InspectionStatus;

  @Column({ type: 'text', name: 'owner_note', default: '' })
  ownerNote: string;

  @Column({ type: 'varchar', name: 'created_at' }) createdAt: string;
  @Column({ type: 'varchar', name: 'updated_at' }) updatedAt: string;
}
