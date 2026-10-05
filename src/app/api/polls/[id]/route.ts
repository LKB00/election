import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { getPoll } from '@/lib/polls';
import { readVoterId } from '@/lib/voter';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(req.url);
  const via = url.searchParams.get('f');
  // ?public=1 (the big screen): the poll as someone who has not voted sees it, so a presenter who voted never puts
  // hidden results on a TV in front of the room.
  const voter = url.searchParams.get('public') === '1' ? null : await readVoterId();
  const poll = await getPoll(await getDb(), id, voter, via);
  if (!poll) return NextResponse.json({ error: 'Poll not found' }, { status: 404 });
  return NextResponse.json(poll, { headers: { 'Cache-Control': 'no-store' } });
}
