import { BadRequestException, ConflictException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, pbkdf2, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { Repository } from 'typeorm';
import { MailerService } from '../../common/mail/mailer.service';
import { nowIso } from '../../common/util';
import { User } from '../users/user.entity';
import { ForgotPasswordDto, LoginDto, RegisterDto, ResetPasswordDto } from './dto/auth.dto';
import { PasswordReset } from './password-reset.entity';
import { Session } from './session.entity';

const pbkdf2Async = promisify(pbkdf2);
const ITERATIONS = 310_000;
const SESSION_DAYS = 7;
const RESET_MINUTES = 30;
const MAX_RESET_ATTEMPTS = 5;
const resetHash = (userId: number, code: string): string => createHash('sha256').update(`${userId}:${code}`).digest('hex');

export const hashToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const sum = await pbkdf2Async(password, salt, ITERATIONS, 32, 'sha256');
  return `${salt.toString('hex')}$${sum.toString('hex')}`;
}

export async function checkPassword(password: string, encoded: string): Promise<boolean> {
  const [saltHex, hashHex] = encoded.split('$');
  if (!saltHex || !hashHex) return false;
  const want = Buffer.from(hashHex, 'hex');
  const got = await pbkdf2Async(password, Buffer.from(saltHex, 'hex'), ITERATIONS, want.length, 'sha256');
  return got.length === want.length && timingSafeEqual(got, want);
}

/** Public shape of an account; never exposes the password hash. */
export const publicUser = (u: User) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  phone: u.phone,
  role: u.role,
  verified: u.verified,
});

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Session) private readonly sessions: Repository<Session>,
    @InjectRepository(PasswordReset) private readonly resets: Repository<PasswordReset>,
    private readonly mailer: MailerService,
  ) {}

  async register(dto: RegisterDto) {
    if (await this.users.existsBy({ email: dto.email })) {
      throw new ConflictException('An account with this email may already exist');
    }
    const user = await this.users.save(
      this.users.create({
        ...dto,
        passwordHash: await hashPassword(dto.password),
        verified: false,
        createdAt: nowIso(),
      }),
    );
    return { user: publicUser(user), token: await this.issueToken(user.id) };
  }

  async login(dto: LoginDto) {
    const user = await this.users
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('u.email = :email', { email: dto.email })
      .getOne();
    if (!user || !(await checkPassword(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Email or password is incorrect');
    }
    if (user.suspended) throw new ForbiddenException('This account has been suspended');
    return { user: publicUser(user), token: await this.issueToken(user.id) };
  }

  /**
   * Emails a one-time code. Always answers the same way, whether or not the address has an account,
   * so this can't be used to find out who is registered.
   */
  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const user = await this.users.findOneBy({ email: dto.email });
    if (!user || user.suspended) return;
    await this.resets.delete({ userId: user.id });
    const code = String(randomInt(0, 100_000_000)).padStart(8, '0');
    await this.resets.insert({ userId: user.id, codeHash: resetHash(user.id, code), expiresAt: new Date(Date.now() + RESET_MINUTES * 60_000).toISOString(), attempts: 0 });
    await this.mailer.send({
      to: user.email,
      subject: 'Your AreaScout password reset code',
      text: `Your code is ${code}. It works for ${RESET_MINUTES} minutes. If you didn’t ask to reset your password, ignore this email.`,
    });
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const bad = new BadRequestException('That code is invalid or has expired');
    const user = await this.users.findOneBy({ email: dto.email });
    if (!user) throw bad;
    const row = await this.resets.findOneBy({ userId: user.id });
    if (!row || row.expiresAt <= nowIso()) throw bad;
    if (row.attempts >= MAX_RESET_ATTEMPTS) { await this.resets.delete({ id: row.id }); throw bad; }
    const given = Buffer.from(resetHash(user.id, dto.code));
    const want = Buffer.from(row.codeHash);
    if (given.length !== want.length || !timingSafeEqual(given, want)) {
      await this.resets.increment({ id: row.id }, 'attempts', 1);
      throw bad;
    }
    await this.users.update(user.id, { passwordHash: await hashPassword(dto.new_password) });
    await this.resets.delete({ userId: user.id });
    await this.sessions.delete({ userId: user.id }); // anyone holding the old password is signed out
  }

  async logout(tokenHash: string | undefined): Promise<void> {
    if (tokenHash) await this.sessions.delete({ tokenHash });
  }

  async userForToken(token: string): Promise<User | null> {
    const session = await this.sessions.findOneBy({ tokenHash: hashToken(token) });
    if (!session || session.expiresAt <= nowIso()) return null;
    const user = await this.users.findOneBy({ id: session.userId });
    return user && !user.suspended ? user : null;
  }

  private async issueToken(userId: number): Promise<string> {
    const token = randomBytes(36).toString('base64url');
    await this.sessions.insert({
      tokenHash: hashToken(token),
      userId,
      expiresAt: new Date(Date.now() + SESSION_DAYS * 86_400_000).toISOString(),
    });
    return token;
  }
}
