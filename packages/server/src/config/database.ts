import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { env } from './env';
import { logger } from '../utils/logger';
import * as schema from '../db/schema';

const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30_000,
});

pool.on('error', (err) => {
  logger.error({ err }, 'PostgreSQL pool error');
});

/**
 * The Drizzle DB handle used by every service function.
 *
 * Always filter multi-tenant queries by req.auth.tenantId — there is no
 * framework-level enforcement. A missing `.where(eq(table.tenantId, …))`
 * will leak data across tenants.
 *
 * Usage: `db.select().from(crmCompanies).where(eq(crmCompanies.tenantId, t))`.
 */
export const db = drizzle(pool, { schema });

/** Raw pg pool — use sparingly; most code should go through `db`. */
export { pool };

export async function closeDb() {
  await pool.end();
  logger.info('PostgreSQL connection closed');
}
