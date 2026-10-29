import type { DataSourceOptions } from 'typeorm';
import { join } from 'node:path';
import type { Env } from '../config/env';

type PostgresOptions = Extract<DataSourceOptions, { type: 'postgres' }>;
type DbEnv = Pick<
  Env,
  'DATABASE_URL' | 'DB_HOST' | 'DB_PORT' | 'DB_USERNAME' | 'DB_PASSWORD' | 'DB_NAME' | 'DB_SCHEMA' | 'DB_SSL' | 'DB_SSL_CA' | 'DB_SSL_REJECT_UNAUTHORIZED' | 'DB_MIGRATIONS_RUN'
>;

/** Accepts the certificate as PEM text (with real or escaped "\n" line breaks) or as base64 of that text. */
export function decodeCa(value: string): string {
  const text = value.trim();
  if (text.includes('-----BEGIN')) return text.replace(/\\n/g, '\n');
  return Buffer.from(text, 'base64').toString('utf8');
}

/**
 * Postgres connection settings, shared by the running app and the migration command so both
 * talk to the database the same way. The schema is only ever changed by migrations.
 */
export function postgresOptions(env: DbEnv): PostgresOptions {
  const ssl = env.DB_SSL
    ? { rejectUnauthorized: env.DB_SSL_REJECT_UNAUTHORIZED, ...(env.DB_SSL_CA ? { ca: decodeCa(env.DB_SSL_CA) } : {}) }
    : false;
  return {
    type: 'postgres',
    ...(env.DATABASE_URL
      ? { url: env.DATABASE_URL }
      : { host: env.DB_HOST, port: env.DB_PORT, username: env.DB_USERNAME, password: env.DB_PASSWORD, database: env.DB_NAME }),
    schema: env.DB_SCHEMA,
    ssl,
    synchronize: false,
    migrationsRun: env.DB_MIGRATIONS_RUN,
    // Works from source (ts-node, tests) and from the compiled dist folder.
    migrations: [join(__dirname, 'migrations', '*.{js,ts}')],
  };
}
