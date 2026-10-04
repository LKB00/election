import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { duePolls, pushEnabled, sendResultAlerts } from '@/lib/push';

// Run by Vercel every evening just after the 9 pm final count (vercel.json): one "the result is in" alert per phone
// for polls that ended. Vercel sends CRON_SECRET as a bearer token; anyone else is turned away.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) return NextResponse.json({ error: 'Not allowed.' }, { status: 403 });
  if (!pushEnabled()) return NextResponse.json({ sent: 0 });
  const db = await getDb();
  const sent = await sendResultAlerts(db, await duePolls(db));
  return NextResponse.json({ sent });
}
