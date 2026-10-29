import { Global, Injectable, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Env } from '../../config/env';

export interface Mail { to: string; subject: string; text: string }

/**
 * Outgoing email. No provider is connected yet, so messages are written to the server log instead.
 * In development the body is logged too (so you can read a reset code); in production only the
 * recipient and subject are, because the body can contain secrets. Replace `send` to deliver for real.
 */
@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);

  constructor(private readonly config: ConfigService<Env, true>) {}

  async send(mail: Mail): Promise<void> {
    const dev = this.config.get('NODE_ENV', { infer: true }) !== 'production';
    this.logger.warn(`Email not sent (no mail provider configured): to=${mail.to} subject="${mail.subject}"${dev ? `\n${mail.text}` : ''}`);
  }
}

@Global()
@Module({ providers: [MailerService], exports: [MailerService] })
export class MailerModule {}
