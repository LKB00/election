import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { mkdirSync } from 'node:fs';
import postgres from 'postgres';
import * as schema from './schema';
import { seedFlagship } from './seed';

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
ALTER TABLE polls ADD COLUMN IF NOT EXISTS reasons text NOT NULL DEFAULT '[]';
ALTER TABLE polls ADD COLUMN IF NOT EXISTS featured boolean NOT NULL DEFAULT false;
ALTER TABLE polls ADD COLUMN IF NOT EXISTS hidden boolean NOT NULL DEFAULT false;
-- Duels from before review existed count as reviewed; new ones start unreviewed.
ALTER TABLE polls ADD COLUMN IF NOT EXISTS reviewed boolean NOT NULL DEFAULT true;
ALTER TABLE polls ALTER COLUMN reviewed SET DEFAULT false;
CREATE INDEX IF NOT EXISTS polls_created_idx ON polls (created_at);
CREATE TABLE IF NOT EXISTS options (
  id text PRIMARY KEY,
  poll_id text NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  label text NOT NULL,
  image_url text,
  position integer NOT NULL
);
ALTER TABLE options ADD COLUMN IF NOT EXISTS subtitle text;
ALTER TABLE options ADD COLUMN IF NOT EXISTS image_credit text;
ALTER TABLE options ADD COLUMN IF NOT EXISTS emoji text;
CREATE INDEX IF NOT EXISTS options_poll_idx ON options (poll_id);
CREATE TABLE IF NOT EXISTS votes (
  id text PRIMARY KEY,
  poll_id text NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  option_id text NOT NULL REFERENCES options(id) ON DELETE CASCADE,
  voter_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE votes ADD COLUMN IF NOT EXISTS reason text;
CREATE UNIQUE INDEX IF NOT EXISTS votes_one_per_voter ON votes (poll_id, voter_key);
CREATE INDEX IF NOT EXISTS votes_option_idx ON votes (option_id);
CREATE INDEX IF NOT EXISTS votes_poll_time_idx ON votes (poll_id, created_at);
-- Votes from before the guess game count as "already answered" ('skip'); new votes start at null.
ALTER TABLE votes ADD COLUMN IF NOT EXISTS prediction text DEFAULT 'skip';
ALTER TABLE votes ALTER COLUMN prediction DROP DEFAULT;
ALTER TABLE votes ADD COLUMN IF NOT EXISTS prediction_correct boolean;
ALTER TABLE votes ADD COLUMN IF NOT EXISTS share_code text;
ALTER TABLE votes ADD COLUMN IF NOT EXISTS via text;
CREATE UNIQUE INDEX IF NOT EXISTS votes_share_code ON votes (share_code);
CREATE INDEX IF NOT EXISTS votes_via_idx ON votes (poll_id, via);
CREATE TABLE IF NOT EXISTS reactions (
  poll_id text NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  voter_key text NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (poll_id, voter_key, emoji)
);
CREATE TABLE IF NOT EXISTS reports (
  poll_id text NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  voter_key text NOT NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (poll_id, voter_key)
);
-- Who reported, as a hashed network address: clearing cookies does not make one person count as three.
ALTER TABLE reports ADD COLUMN IF NOT EXISTS ip_hash text;
ALTER TABLE polls ADD COLUMN IF NOT EXISTS has_photos boolean NOT NULL DEFAULT false;
ALTER TABLE polls ADD COLUMN IF NOT EXISTS election_mode boolean NOT NULL DEFAULT false;
CREATE TABLE IF NOT EXISTS photos (
  id text PRIMARY KEY,
  poll_id text NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  data text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS photos_poll_idx ON photos (poll_id);
`;

const g = globalThis as unknown as { __db?: Promise<Db> };

async function connect(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  if (!url && process.env.NODE_ENV === 'production') {
    // Hosting has no permanent disk, so a local database would lose every poll.
    throw new Error('DATABASE_URL is not set. Add it in your hosting settings.');
  }
  if (url) {
    // Few connections per server (many servers run at once on Vercel).
    // prepare:false keeps it working with hosted connection poolers (Neon, Supabase).
    const client = postgres(url, { max: Number(process.env.DB_POOL_MAX ?? 3), prepare: false });
    // The lock stops two servers starting together from creating tables at the same time.
    await client.begin(async (tx) => {
      await tx`select pg_advisory_xact_lock(727274)`;
      await tx.unsafe(SCHEMA_SQL);
    });
    const db = drizzlePostgres(client, { schema }) as unknown as Db;
    await seedFlagship(db);
    return db;
  }
  // No database set up: use a local file database so the app "just runs".
  const { PGlite } = await import('@electric-sql/pglite');
  const dir = process.env.PGLITE_DIR ?? '.data/pg';
  if (!dir.startsWith('memory://')) mkdirSync('.data', { recursive: true });
  const client = new PGlite(dir);
  await client.exec(SCHEMA_SQL);
  const db = drizzlePglite(client, { schema }) as unknown as Db;
  await seedFlagship(db);
  return db;
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
