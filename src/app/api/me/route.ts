import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { getVoterStats } from '@/lib/polls';
import { readVoterId } from '@/lib/voter';

export const dynamic = 'force-dynamic';

export async function GET() {
  const stats = await getVoterStats(await getDb(), await readVoterId());
  return NextResponse.json(stats, { headers: { 'Cache-Control': 'no-store' } });
}
