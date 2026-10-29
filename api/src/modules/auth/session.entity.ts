import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('sessions')
export class Session {
  @PrimaryColumn({ type: 'varchar', name: 'token_hash' })
  tokenHash: string;

  @Index()
  @Column({ type: 'int', name: 'user_id' })
  userId: number;

  @Column({ type: 'varchar', name: 'expires_at' })
  expiresAt: string;
}
