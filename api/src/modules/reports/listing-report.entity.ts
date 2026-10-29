import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Listing } from '../listings/listing.entity';
import { User } from '../users/user.entity';

export const REPORT_STATUSES = ['open', 'reviewing', 'resolved', 'dismissed'] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

@Entity('listing_reports')
export class ListingReport {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', name: 'listing_id' })
  listingId: number;

  @ManyToOne(() => Listing)
  @JoinColumn({ name: 'listing_id' })
  listing: Listing;

  @Column({ type: 'int', name: 'reporter_id' })
  reporterId: number;

  @Column({ type: 'varchar' }) reason: string;
  @Column({ type: 'text', default: '' }) details: string;
  @Column({ type: 'varchar', default: 'open' }) status: ReportStatus;
  @Column({ type: 'text', default: '' }) resolution: string;

  @Column({ type: 'varchar', name: 'created_at' }) createdAt: string;
  @Column({ type: 'varchar', name: 'updated_at' }) updatedAt: string;
}
