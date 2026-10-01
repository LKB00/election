import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { getPoll } from '@/lib/polls';
import { readVoterId } from '@/lib/voter';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const poll = await getPoll(await getDb(), id, await readVoterId());
  if (!poll) return NextResponse.json({ error: 'Poll not found' }, { status: 404 });
  return NextResponse.json(poll, { headers: { 'Cache-Control': 'no-store' } });
}
