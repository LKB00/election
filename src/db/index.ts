import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { mkdirSync } from 'node:fs';
import postgres from 'postgres';
import * as schema from './schema';

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS polls (
  id text PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'general',
  hide_until_voted boolean NOT NULL DEFAULT false,
  allow_change boolean NOT NULL DEFAULT false,
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS polls_created_idx ON polls (created_at);
CREATE TABLE IF NOT EXISTS options (
  id text PRIMARY KEY,
  poll_id text NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  label text NOT NULL,
  image_url text,
  position integer NOT NULL
);
CREATE INDEX IF NOT EXISTS options_poll_idx ON options (poll_id);
CREATE TABLE IF NOT EXISTS votes (
  id text PRIMARY KEY,
  poll_id text NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  option_id text NOT NULL REFERENCES options(id) ON DELETE CASCADE,
  voter_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS votes_one_per_voter ON votes (poll_id, voter_key);
CREATE INDEX IF NOT EXISTS votes_option_idx ON votes (option_id);
`;

const g = globalThis as unknown as { __db?: Promise<Db> };

async function connect(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const client = postgres(url, { max: 10 });
    await client.unsafe(SCHEMA_SQL);
    return drizzlePostgres(client, { schema }) as unknown as Db;
  }
  // No database set up: use a local file database so the app "just runs".
  const { PGlite } = await import('@electric-sql/pglite');
  const dir = process.env.PGLITE_DIR ?? '.data/pg';
  if (!dir.startsWith('memory://')) mkdirSync('.data', { recursive: true });
  const client = new PGlite(dir);
  await client.exec(SCHEMA_SQL);
  return drizzlePglite(client, { schema }) as unknown as Db;
}

/** One shared database connection per server process. */
export function getDb(): Promise<Db> {
  g.__db ??= connect().catch((err) => {
    g.__db = undefined; // do not remember a failed connection
    throw err;
  });
  return g.__db;
}

export { schema };
