import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Area } from '../areas/area.entity';
import { User } from '../users/user.entity';

export const LISTING_STATUSES = ['draft', 'pending', 'live', 'rejected', 'removed'] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

@Entity('listings')
@Index(['status', 'areaId', 'propertyType', 'rent', 'bedrooms'])
export class Listing {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', name: 'owner_id' })
  ownerId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'owner_id' })
  owner: User;

  @Column({ type: 'int', name: 'area_id' })
  areaId: number;

  @ManyToOne(() => Area)
  @JoinColumn({ name: 'area_id' })
  area: Area;

  @Column({ type: 'varchar' }) title: string;
  @Column({ type: 'text', default: '' }) description: string;
  @Column({ type: 'varchar' }) address: string;

  @Column({ type: 'varchar', name: 'property_type' })
  propertyType: string;

  @Column({ type: 'int', default: 0 }) bedrooms: number;
  @Column({ type: 'int', default: 0 }) bathrooms: number;

  /** Integer naira. */
  @Column({ type: 'int' }) rent: number;

  @Column({ type: 'varchar', name: 'rent_period', default: 'year' })
  rentPeriod: string;

  @Column({ type: 'int', name: 'agency_fee', default: 0 }) agencyFee: number;
  @Column({ type: 'int', name: 'legal_fee', default: 0 }) legalFee: number;
  @Column({ type: 'int', name: 'caution_deposit', default: 0 }) cautionDeposit: number;
  @Column({ type: 'int', name: 'service_charge', default: 0 }) serviceCharge: number;
  @Column({ type: 'int', default: 0 }) utilities: number;

  @Column({ type: 'simple-json', default: '[]' }) features: string[];
  @Column({ type: 'simple-json', default: '[]' }) photos: string[];

  @Column({ type: 'boolean', default: false }) verified: boolean;

  /** Set when repeated reports pulled a live listing back into review, so dismissing them can restore it. */
  @Column({ type: 'boolean', name: 'hidden_by_reports', default: false })
  hiddenByReports: boolean;

  @Column({ type: 'int', name: 'view_count', default: 0 })
  viewCount: number;

  @Column({ type: 'varchar', default: 'pending' })
  status: ListingStatus;

  @Column({ type: 'varchar', name: 'created_at' }) createdAt: string;
  @Column({ type: 'varchar', name: 'updated_at' }) updatedAt: string;
}
