import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { getDb } from '@/db';

export const dynamic = 'force-dynamic';

// Open /api/health after deploying: {"ok":true} means the app and database are connected.
export async function GET() {
  try {
    await (await getDb()).execute(sql`select 1`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    // The details go to the server log only; the public answer never shows database errors.
    console.error('health', err);
    return NextResponse.json({ ok: false, error: 'database' }, { status: 503 });
  }
}
