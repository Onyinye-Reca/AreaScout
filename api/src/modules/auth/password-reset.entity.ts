import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('password_resets')
export class PasswordReset {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ type: 'int', name: 'user_id' })
  userId: number;

  /** SHA-256 of the user id and the emailed code; the code itself is never stored. */
  @Column({ type: 'varchar', name: 'code_hash' })
  codeHash: string;

  @Column({ type: 'varchar', name: 'expires_at' })
  expiresAt: string;

  /** Wrong guesses so far; the code is burned after too many. */
  @Column({ type: 'int', default: 0 })
  attempts: number;
}
