import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('areas')
export class Area {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', unique: true })
  slug: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar', default: 'Lagos' })
  city: string;

  @Column({ type: 'text', default: '' })
  description: string;

  @Column({ type: 'varchar', default: 'No data' })
  power: string;

  @Column({ type: 'varchar', default: 'No data' })
  flooding: string;

  @Column({ type: 'varchar', default: 'No data' })
  security: string;

  @Column({ type: 'varchar', default: 'No data' })
  water: string;

  @Column({ type: 'varchar', default: 'No data' })
  transport: string;

  @Column({ type: 'varchar', default: 'No data' })
  internet: string;

  @Column({ type: 'int', default: 0 })
  score: number;

  @Column({ type: 'varchar', name: 'updated_at' })
  updatedAt: string;
}
