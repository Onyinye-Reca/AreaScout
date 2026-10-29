import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../users/user.entity';

/** A renter's rating of a landlord or agent, allowed once per confirmed inspection they attended. */
@Entity('lister_reviews')
export class ListerReview {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ type: 'int', name: 'owner_id' })
  ownerId: number;

  @Column({ type: 'int', name: 'tenant_id' })
  tenantId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'tenant_id' })
  tenant: User;

  @Column({ type: 'int', name: 'listing_id' })
  listingId: number;

  @Index({ unique: true })
  @Column({ type: 'int', name: 'inspection_id' })
  inspectionId: number;

  @Column({ type: 'int' })
  rating: number;

  @Column({ type: 'text', default: '' })
  comment: string;

  @Column({ type: 'varchar', default: 'published' })
  status: 'published' | 'hidden';

  @Column({ type: 'varchar', name: 'created_at' })
  createdAt: string;
}
