import type { DataSourceOptions } from 'typeorm';
import { join } from 'node:path';
import type { Env } from '../config/env';

/**
 * Postgres connection settings, shared by the running app and the migration command so both
 * talk to the database the same way. The schema is only ever changed by migrations.
 */
type PostgresOptions = Extract<DataSourceOptions, { type: 'postgres' }>;

export function postgresOptions(env: Pick<Env, 'DATABASE_URL' | 'DB_HOST' | 'DB_PORT' | 'DB_USERNAME' | 'DB_PASSWORD' | 'DB_NAME' | 'DB_SCHEMA' | 'DB_SSL' | 'DB_MIGRATIONS_RUN'>): PostgresOptions {
  return {
    type: 'postgres',
    ...(env.DATABASE_URL
      ? { url: env.DATABASE_URL }
      : { host: env.DB_HOST, port: env.DB_PORT, username: env.DB_USERNAME, password: env.DB_PASSWORD, database: env.DB_NAME }),
    schema: env.DB_SCHEMA,
    ssl: env.DB_SSL,
    synchronize: false,
    migrationsRun: env.DB_MIGRATIONS_RUN,
    // Works from source (ts-node, tests) and from the compiled dist folder.
    migrations: [join(__dirname, 'migrations', '*.{js,ts}')],
  };
}
