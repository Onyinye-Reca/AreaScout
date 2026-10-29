import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { Role } from '../../common/decorators/roles.decorator';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar', unique: true })
  email: string;

  @Column({ type: 'varchar', default: '' })
  phone: string;

  @Column({ type: 'varchar' })
  role: Role;

  @Column({ type: 'varchar', name: 'password_hash', select: false })
  passwordHash: string;

  @Column({ type: 'boolean', default: false })
  verified: boolean;

  /** Which updates the user wants; see NotificationPrefs. Missing keys mean "on". */
  @Column({ type: 'simple-json', name: 'notification_prefs', default: '{}' })
  notificationPrefs: Partial<Record<'inspection_updates' | 'messages' | 'saved_search_alerts' | 'area_report_updates', boolean>>;

  /** Suspended accounts cannot sign in and their listings are hidden. */
  @Column({ type: 'boolean', default: false })
  suspended: boolean;

  @Column({ type: 'varchar', name: 'created_at' })
  createdAt: string;
}
