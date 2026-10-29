import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { join } from 'node:path';
import { validateEnv } from '../config/env';
import { postgresOptions } from './postgres-options';

/**
 * Used only by the TypeORM command line (see the migration:* scripts in package.json):
 * it reads the same environment variables as the app.
 */
export default new DataSource({
  ...postgresOptions(validateEnv(process.env)),
  entities: [join(__dirname, '..', 'modules', '**', '*.entity.{js,ts}')],
});
