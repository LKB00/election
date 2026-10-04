import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { and, eq, sql } from 'drizzle-orm';
import { schema, type Db } from '@/db';
import { isCode } from './validation';

// Shared by the share images (link preview and story card).
// Figtree, the Arogya Line typeface (static .woff files: the image renderer cannot read variable fonts).
const fontDir = path.join(process.cwd(), 'node_modules/@fontsource/figtree/files');
let fontCache: Promise<{ name: string; data: Buffer; weight: 400 | 700; style: 'normal' }[]> | null = null;
export function cardFonts() {
  fontCache ??= Promise.all([
    readFile(path.join(fontDir, 'figtree-latin-400-normal.woff')),
    readFile(path.join(fontDir, 'figtree-latin-600-normal.woff')),
  ]).then(([r, b]) => [
    { name: 'Figtree', data: r, weight: 400 as const, style: 'normal' as const },
    { name: 'Figtree', data: b, weight: 700 as const, style: 'normal' as const },
  ]);
  return fontCache;
}

/** The option the sender picked, from their share code (never who they are). */
export async function pickFromCode(db: Db, pollId: string, code: string | null) {
  if (!isCode(code)) return null;
  const [v] = await db
    .select({ optionId: schema.votes.optionId })
    .from(schema.votes)
    .where(and(eq(schema.votes.pollId, pollId), eq(schema.votes.shareCode, code)))
    .limit(1);
  return v?.optionId ?? null;
}

// The Arogya Line palette (same values as src/styles/arogya.css). "lime" is the brand yellow: the colour of "you".
export const CARD = { ink: '#1d1b18', paper: '#fbf9f6', sand: '#f5f2ed', lime: '#fcd12a', green: '#2f7d4f', muted: '#5e5a53', tints: ['#e0e3ff', '#fce4ec', '#ddf1e3', '#fdf4df'] };
export { faceLabels } from './labels';

/** Friends who voted from this share link, and how many picked the same as the sender. Never says who leads. */
export async function friendsFromCode(db: Db, pollId: string, code: string | null, pickId: string | null) {
  if (!isCode(code) || !pickId) return { all: 0, agree: 0 };
  const [row] = await db
    .select({
      all: sql<number>`count(*)::int`,
      agree: sql<number>`count(*) filter (where ${schema.votes.optionId} = ${pickId})::int`,
    })
    .from(schema.votes)
    .where(and(eq(schema.votes.pollId, pollId), eq(schema.votes.via, code)));
  return { all: row?.all ?? 0, agree: row?.agree ?? 0 };
}
