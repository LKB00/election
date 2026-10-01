import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { getPoll } from '@/lib/polls';
import { readVoterId } from '@/lib/voter';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const via = new URL(req.url).searchParams.get('f');
  const poll = await getPoll(await getDb(), id, await readVoterId(), via);
  if (!poll) return NextResponse.json({ error: 'Poll not found' }, { status: 404 });
  return NextResponse.json(poll, { headers: { 'Cache-Control': 'no-store' } });
}
