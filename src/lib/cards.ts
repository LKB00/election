import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { and, eq } from 'drizzle-orm';
import { schema, type Db } from '@/db';

// Shared by the share images (link preview and story card).
const fontDir = path.join(process.cwd(), 'node_modules/@fontsource/lato/files');
let fontCache: Promise<{ name: string; data: Buffer; weight: 400 | 700; style: 'normal' }[]> | null = null;
export function cardFonts() {
  fontCache ??= Promise.all([
    readFile(path.join(fontDir, 'lato-latin-400-normal.woff')),
    readFile(path.join(fontDir, 'lato-latin-700-normal.woff')),
  ]).then(([r, b]) => [
    { name: 'Lato', data: r, weight: 400 as const, style: 'normal' as const },
    { name: 'Lato', data: b, weight: 700 as const, style: 'normal' as const },
  ]);
  return fontCache;
}

/** The option the sender picked, from their share code (never who they are). */
export async function pickFromCode(db: Db, pollId: string, code: string | null) {
  if (!code) return null;
  const [v] = await db
    .select({ optionId: schema.votes.optionId })
    .from(schema.votes)
    .where(and(eq(schema.votes.pollId, pollId), eq(schema.votes.shareCode, code)))
    .limit(1);
  return v?.optionId ?? null;
}

export const CARD = { ink: '#24282c', paper: '#fbfbf7', sand: '#f7f6f0', lime: '#c2ef72', green: '#5a7a1f', muted: '#5b5e61', tints: ['#e5eef7', '#f6e8ec', '#eef3dc', '#f5efd8'] };
export { faceLabels } from './labels';
