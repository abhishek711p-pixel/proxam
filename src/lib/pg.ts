import "server-only";
import { Pool, type PoolClient, type QueryResultRow } from "pg";

// One small connection pool per server instance.
// On Neon, DATABASE_URL should be the POOLED connection string (host has "-pooler"),
// so thousands of server instances can share the database without running out of connections.

type G = { __pgPool?: Pool };
const g = globalThis as unknown as G;

function pool() {
  if (g.__pgPool) return g.__pgPool;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Put your Neon connection string in .env.local, then run: npm run db:setup");
  const local = /localhost|127\.0\.0\.1/.test(url);
  g.__pgPool = new Pool({
    connectionString: url,
    max: Number(process.env.DB_POOL_MAX || 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    ssl: local ? undefined : { rejectUnauthorized: true },
  });
  g.__pgPool.on("error", (e) => console.error("[db] idle client error", e.message));
  return g.__pgPool;
}

export type Client = Pick<PoolClient, "query">;

/** Run one query. Values go as $1, $2... (never put user input into the SQL text). */
export async function q<T extends QueryResultRow = QueryResultRow>(sql: string, params: unknown[] = [], c?: Client): Promise<T[]> {
  const r = await (c || pool()).query<T>(sql, params as unknown[]);
  return r.rows;
}

export async function q1<T extends QueryResultRow = QueryResultRow>(sql: string, params: unknown[] = [], c?: Client): Promise<T | undefined> {
  return (await q<T>(sql, params, c))[0];
}

/** Several queries that must all happen or none (money, seats, attempts). */
export async function tx<T>(fn: (c: Client) => Promise<T>): Promise<T> {
  const c = await pool().connect();
  try {
    await c.query("begin");
    const out = await fn(c);
    await c.query("commit");
    return out;
  } catch (e) {
    await c.query("rollback").catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}

/** Postgres error code for "unique index says no" (a duplicate). */
export const isUniqueViolation = (e: unknown) => (e as { code?: string })?.code === "23505";
