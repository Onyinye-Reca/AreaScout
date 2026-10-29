import { validateEnv } from '../config/env';
import { decodeCa, postgresOptions } from './postgres-options';

const PEM = '-----BEGIN CERTIFICATE-----\nMIIBfake\n-----END CERTIFICATE-----';
const opts = (env: Record<string, string>) => postgresOptions(validateEnv({ DB_TYPE: 'postgres', ...env }));

describe('postgres connection settings', () => {
  it('uses a plain connection when SSL is off, and the connection string when one is given', () => {
    expect(opts({}).ssl).toBe(false);
    const o = opts({ DATABASE_URL: 'postgresql://u:p@host:5432/db' });
    expect(o).toMatchObject({ url: 'postgresql://u:p@host:5432/db', migrationsRun: true, synchronize: false });
    expect('host' in o).toBe(false);
  });

  it('verifies the server by default when SSL is on', () => {
    expect(opts({ DB_SSL: 'true' }).ssl).toEqual({ rejectUnauthorized: true });
  });

  it('trusts the provider’s own certificate authority when given (PEM, escaped-newline PEM or base64)', () => {
    const base64 = Buffer.from(PEM).toString('base64');
    for (const value of [PEM, PEM.replace(/\n/g, '\\n'), base64]) {
      expect(opts({ DB_SSL: 'true', DB_SSL_CA: value }).ssl).toEqual({ rejectUnauthorized: true, ca: PEM });
    }
    expect(decodeCa(`  ${PEM}  `)).toBe(PEM);
  });

  it('can skip the identity check only when explicitly told to', () => {
    expect(opts({ DB_SSL: 'true', DB_SSL_REJECT_UNAUTHORIZED: 'false' }).ssl).toEqual({ rejectUnauthorized: false });
  });
});
