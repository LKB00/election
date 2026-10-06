import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { purgeDeleted } from '@/lib/maker';
import { duePolls, pushEnabled, sendResultAlerts } from '@/lib/push';
import { sameSecret } from '@/lib/admin';

// Run by Vercel every evening just after the 9 pm final count (vercel.json): one "the result is in" alert per phone
// for polls that ended, and the clean-up of polls deleted more than 180 days ago. Vercel sends CRON_SECRET as a bearer token; anyone else is turned away.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !sameSecret(req.headers.get('authorization'), `Bearer ${secret}`)) return NextResponse.json({ error: 'Not allowed.' }, { status: 403 });
  const db = await getDb();
  // Polls their makers deleted, past the 180 days the Rules promise to keep them, are erased with their votes.
  const purged = await purgeDeleted(db);
  if (!pushEnabled()) return NextResponse.json({ sent: 0, purged });
  const sent = await sendResultAlerts(db, await duePolls(db));
  return NextResponse.json({ sent, purged });
}
