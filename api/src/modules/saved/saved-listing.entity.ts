import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Listing } from '../listings/listing.entity';

@Entity('saved_listings')
export class SavedListing {
  @PrimaryColumn({ type: 'int', name: 'user_id' })
  userId: number;

  @PrimaryColumn({ type: 'int', name: 'listing_id' })
  listingId: number;

  @ManyToOne(() => Listing, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'listing_id' })
  listing: Listing;

  @Column({ type: 'varchar', name: 'created_at' })
  createdAt: string;
}
