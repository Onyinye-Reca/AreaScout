import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export interface SearchFilters {
  q?: string; type?: string; beds?: number; min_rent?: number; max_rent?: number; verified?: '1' | 'true'; area?: string; city?: string;
}

@Entity('saved_searches')
export class SavedSearch {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ type: 'int', name: 'user_id' })
  userId: number;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'simple-json' })
  filters: SearchFilters;

  /** Whether the user wants to hear about new matches. Delivery beyond the app isn't wired up yet. */
  @Column({ type: 'boolean', default: true })
  alerts: boolean;

  @Column({ type: 'varchar', name: 'created_at' })
  createdAt: string;

  /** Matches updated after this count as "new". */
  @Column({ type: 'varchar', name: 'last_seen_at' })
  lastSeenAt: string;
}
