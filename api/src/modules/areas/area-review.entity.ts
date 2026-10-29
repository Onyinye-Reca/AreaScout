import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../users/user.entity';
import { Area } from './area.entity';

export const REVIEW_STATUSES = ['pending', 'published', 'rejected'] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

@Entity('area_reviews')
export class AreaReview {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ type: 'int', name: 'area_id' })
  areaId: number;

  @ManyToOne(() => Area, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'area_id' })
  area: Area;

  @Column({ type: 'int', name: 'user_id' })
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'int', nullable: true }) power: number | null;
  @Column({ type: 'int', nullable: true }) flooding: number | null;
  @Column({ type: 'int', nullable: true }) security: number | null;
  @Column({ type: 'int', nullable: true }) water: number | null;
  @Column({ type: 'int', nullable: true }) transport: number | null;
  @Column({ type: 'int', nullable: true }) internet: number | null;

  @Column({ type: 'text' })
  comment: string;

  @Column({ type: 'varchar', default: 'pending' })
  status: ReviewStatus;

  @Column({ type: 'varchar', name: 'created_at' })
  createdAt: string;
}
