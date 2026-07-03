import "server-only";
import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg";

let pool: Pool | null = null;

function getDatabaseUrl(): string | null {
  return process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL || null;
}

function normalizeConnectionString(url: string): string {
  // The pg driver can over-interpret sslmode from Supabase URLs on some Windows/Node stacks.
  // We pass SSL explicitly below, so keep the URL clean and deterministic.
  return url.replace(/\?sslmode=[^&]+&?/, "?").replace(/[?&]$/, "");
}

export function hasPostgresConfig(): boolean {
  return !!getDatabaseUrl();
}

export function getPostgresPool(): Pool {
  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL or SUPABASE_DATABASE_URL is not configured.");
  }

  if (!pool) {
    pool = new Pool({
      connectionString: normalizeConnectionString(databaseUrl),
      ssl: { rejectUnauthorized: false },
      max: 8,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });
  }

  return pool;
}

export async function pgQuery<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<QueryResult<T>> {
  return getPostgresPool().query<T>(text, params);
}

export async function withPgClient<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPostgresPool().connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}
