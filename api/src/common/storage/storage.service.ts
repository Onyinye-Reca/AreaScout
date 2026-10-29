import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Global, Injectable, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Env } from '../../config/env';

export type ImageExtension = 'jpg' | 'png' | 'webp';

const CONTENT_TYPE: Record<ImageExtension, string> = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

/** Stores uploaded listing photos and returns the public address they can be viewed at. */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private s3?: S3Client;

  constructor(private readonly config: ConfigService<Env, true>) {
    if (this.driver === 's3') {
      this.s3 = new S3Client({
        region: this.get('S3_REGION'),
        endpoint: this.get('S3_ENDPOINT'),
        // Custom endpoints (R2, MinIO, Supabase) need path-style addressing; AWS itself doesn't.
        forcePathStyle: !!this.get('S3_ENDPOINT'),
        credentials: { accessKeyId: this.get('S3_ACCESS_KEY_ID')!, secretAccessKey: this.get('S3_SECRET_ACCESS_KEY')! },
      });
      this.logger.log(`Photos are stored in S3 bucket "${this.get('S3_BUCKET')}"`);
    } else {
      this.logger.log(`Photos are stored on this server's disk (${this.get('UPLOAD_DIR')})`);
    }
  }

  private get driver() { return this.config.get('STORAGE_DRIVER', { infer: true }); }
  private get<K extends keyof Env>(k: K): Env[K] { return this.config.get(k, { infer: true }); }

  /**
   * `localBaseUrl` is this server's own address, used only by the local driver to build the link.
   * The file name is random; nothing the client sent is used in it.
   */
  async save(bytes: Buffer, ext: ImageExtension, localBaseUrl: string): Promise<string> {
    const name = `${randomBytes(16).toString('hex')}.${ext}`;
    if (this.s3) {
      const key = `listings/${name}`;
      await this.s3.send(new PutObjectCommand({
        Bucket: this.get('S3_BUCKET'),
        Key: key,
        Body: bytes,
        ContentType: CONTENT_TYPE[ext],
        CacheControl: 'public, max-age=31536000, immutable', // names are random and never reused
      }));
      return `${this.get('S3_PUBLIC_URL')!.replace(/\/+$/, '')}/${key}`;
    }
    const dir = this.get('UPLOAD_DIR');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, name), bytes);
    return `${localBaseUrl}/uploads/${name}`;
  }
}

@Global()
@Module({ providers: [StorageService], exports: [StorageService] })
export class StorageModule {}
