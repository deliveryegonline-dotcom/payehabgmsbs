import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';
import { dbStore } from './store.ts';

declare global {
  var _postgresPool: Pool | undefined;
}

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

export const createPool = () => {
  if (!connectionString) {
    return null;
  }

  if (!global._postgresPool) {
    global._postgresPool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
      max: 10,
      connectionTimeoutMillis: 15000,
    });

    global._postgresPool.on('error', (err) => {
      console.error('Unexpected error on idle SQL pool client:', err);
    });
  }
  return global._postgresPool;
};

const pool = createPool();
export const drizzleDb = pool ? drizzle(pool, { schema }) : null;

export { dbStore };
export * from './types.ts';
export * from './schema.ts';
