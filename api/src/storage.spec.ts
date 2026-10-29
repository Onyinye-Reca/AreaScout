import { ConfigService } from '@nestjs/config';
import { createServer, IncomingMessage, Server } from 'node:http';
import { AddressInfo } from 'node:net';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validateEnv } from './config/env';
import { StorageService } from './common/storage/storage.service';

const config = (values: Record<string, unknown>) => ({ get: (k: string) => values[k] }) as unknown as ConfigService<never, true>;
const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');

describe('photo storage', () => {
  describe('S3 driver', () => {
    let server: Server;
    let endpoint: string;
    const received: { method?: string; url?: string; headers: IncomingMessage['headers']; body: Buffer }[] = [];

    beforeAll(async () => {
      // A stand-in for S3: records what the real AWS client sends, and answers like S3 does.
      server = createServer((req, res) => {
        const chunks: Buffer[] = [];
        req.on('data', (c) => chunks.push(c));
        req.on('end', () => {
          received.push({ method: req.method, url: req.url, headers: req.headers, body: Buffer.concat(chunks) });
          res.writeHead(200, { ETag: '"fake"' }).end();
        });
      });
      await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
      endpoint = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    });
    afterAll(() => new Promise((r) => server.close(r)));

    const make = () =>
      new StorageService(config({
        STORAGE_DRIVER: 's3', S3_BUCKET: 'areascout-photos', S3_REGION: 'auto', S3_ENDPOINT: endpoint,
        S3_ACCESS_KEY_ID: 'test-key', S3_SECRET_ACCESS_KEY: 'test-secret', S3_PUBLIC_URL: 'https://photos.example.com/',
      }));

    it('uploads to the bucket under a random name and returns the public address', async () => {
      const url = await make().save(PNG, 'png', 'http://ignored.local');
      expect(url).toMatch(/^https:\/\/photos\.example\.com\/listings\/[0-9a-f]{32}\.png$/);

      const put = received.at(-1)!;
      expect(put.method).toBe('PUT');
      expect(put.url?.split('?')[0]).toBe(`/areascout-photos/${url.split('/').slice(-2).join('/')}`); // path-style, key matches the URL
      expect(put.headers['content-type']).toBe('image/png');
      expect(put.headers['cache-control']).toContain('immutable');
      expect(put.headers.authorization).toMatch(/^AWS4-HMAC-SHA256 Credential=test-key\//); // signed with the configured key
      expect(put.body.length).toBeGreaterThan(0);
    });

    it('never reuses a name', async () => {
      const s = make();
      expect(await s.save(PNG, 'jpg', '')).not.toBe(await s.save(PNG, 'jpg', ''));
    });

    it('fails loudly when the bucket refuses the upload', async () => {
      server.removeAllListeners('request');
      server.on('request', (_req, res) => res.writeHead(403, { 'Content-Type': 'application/xml' }).end('<Error><Code>AccessDenied</Code></Error>'));
      await expect(make().save(PNG, 'png', '')).rejects.toBeDefined();
    });
  });

  describe('local driver', () => {
    it('writes to disk and links to this server', async () => {
      const dir = mkdtempSync(join(tmpdir(), 'areascout-photos-'));
      const url = await new StorageService(config({ STORAGE_DRIVER: 'local', UPLOAD_DIR: dir })).save(PNG, 'webp', 'http://192.168.0.2:8000');
      const name = url.split('/').pop()!;
      expect(url).toBe(`http://192.168.0.2:8000/uploads/${name}`);
      expect(existsSync(join(dir, name))).toBe(true);
      expect(readFileSync(join(dir, name)).equals(PNG)).toBe(true);
    });
  });

  describe('settings', () => {
    it('rejects an S3 setup that is missing pieces, naming them', () => {
      expect(() => validateEnv({ STORAGE_DRIVER: 's3', S3_BUCKET: 'b' })).toThrow(/S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_PUBLIC_URL/);
    });
    it('accepts a complete one, and local needs nothing extra', () => {
      expect(validateEnv({ STORAGE_DRIVER: 's3', S3_BUCKET: 'b', S3_ACCESS_KEY_ID: 'k', S3_SECRET_ACCESS_KEY: 's', S3_PUBLIC_URL: 'https://x.example.com' }).STORAGE_DRIVER).toBe('s3');
      expect(validateEnv({}).STORAGE_DRIVER).toBe('local');
    });
  });
});
