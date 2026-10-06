import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { voteTotals } from '@/lib/polls';
import { isCode } from '@/lib/validation';
import { LIVE_COUNTS_MAX } from '@/lib/limits';

// GET /api/polls/counts?ids=a,b,c → { a: 12, b: 3 }: total votes for the polls a list is showing, so the numbers tick up
// while the page is open (DuelTiles). Only public polls; odd or extra ids are ignored.
export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get('ids') ?? '';
  const ids = [...new Set(raw.split(',').filter(isCode))].slice(0, LIVE_COUNTS_MAX);
  const totals = await voteTotals(await getDb(), ids);
  return NextResponse.json(totals, { headers: { 'cache-control': 'no-store' } });
}
