import { z } from 'zod';

const bool = z
  .enum(['true', 'false'])
  .default('false')
  .transform((v) => v === 'true');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(8000),
  LOG_LEVEL: z.string().default('info'),
  DB_TYPE: z.enum(['sqlite', 'postgres']).default('sqlite'),
  DB_PATH: z.string().default('data/areascout.sqlite3'),
  /** One connection string (what hosts like Neon and Render hand out); overrides the DB_HOST/PORT/... values below. */
  DATABASE_URL: z.string().optional(),
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().default(5432),
  DB_USERNAME: z.string().default('postgres'),
  DB_PASSWORD: z.string().default('postgres'),
  DB_NAME: z.string().default('areascout'),
  DB_SCHEMA: z.string().default('public'),
  /** Encrypt the database connection (needed for most hosted Postgres). */
  DB_SSL: z.enum(['true', 'false']).default('false').transform((v) => v === 'true'),
  /**
   * The database provider's certificate authority, for providers (like Supabase) whose certificate isn't
   * signed by a public authority. Either the PEM text itself or that text base64-encoded.
   */
  DB_SSL_CA: z.string().optional(),
  /** Set false ONLY as a stop-gap: the connection stays encrypted but the server's identity isn't checked. */
  DB_SSL_REJECT_UNAUTHORIZED: z.enum(['true', 'false']).default('true').transform((v) => v === 'true'),
  /** Apply pending migrations when the app starts (Postgres only). */
  DB_MIGRATIONS_RUN: z.enum(['true', 'false']).default('true').transform((v) => v === 'true'),
  /** Where listing photos are kept: this server's disk (fine locally) or S3-compatible storage (needed on hosts whose disk is wiped on every deploy). */
  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  UPLOAD_DIR: z.string().default('data/uploads'),
  /** S3 settings work with AWS S3, Cloudflare R2, Backblaze B2, Supabase Storage (S3 API) and MinIO. */
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().default('auto'),
  S3_ENDPOINT: z.string().url().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  /** Public address that serves the bucket's files, with no trailing slash (e.g. https://pub-abc.r2.dev). */
  S3_PUBLIC_URL: z.string().url().optional(),
  /** Set false only for tests or local load testing. */
  RATE_LIMIT: z.enum(['true', 'false']).default('true').transform((v) => v === 'true'),
  /** Set true when running behind a reverse proxy (so client IPs are read from X-Forwarded-For). */
  TRUST_PROXY: z.enum(['true', 'false']).default('false').transform((v) => v === 'true'),
  CORS_ORIGIN: z.string().default('*'),
  SWAGGER_ENABLED: bool,
  ADMIN_EMAIL: z.string().optional(),
  ADMIN_PASSWORD: z.string().optional(),
  /** Sample listings and a demo landlord. Leave false on anything real users will see. */
  SEED_DEMO_DATA: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
});

export type Env = z.infer<typeof envSchema>;

const S3_REQUIRED = ['S3_BUCKET', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY', 'S3_PUBLIC_URL'] as const;

export function validateEnv(config: Record<string, unknown>): Env {
  const env = envSchema.parse(config);
  if (env.STORAGE_DRIVER === 's3') {
    const missing = S3_REQUIRED.filter((k) => !env[k]);
    if (missing.length) throw new Error(`STORAGE_DRIVER=s3 needs ${missing.join(', ')}`);
  }
  return env;
}
