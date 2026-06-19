import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { env } from './env';
import * as schema from '../db/schema';

/**
 * [pg]: connection pool for Drizzle ORM.
 */
export const pool = new Pool({
  connectionString: env.DATABASE_URL,
});

/**
 * [Drizzle ORM]: typed database client.
 */
export const db = drizzle(pool, { schema });
