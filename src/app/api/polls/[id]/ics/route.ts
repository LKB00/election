import { getDb } from '@/db';
import { getPoll } from '@/lib/polls';
import { getT } from '@/lib/lang-server';

// "Add result day to my calendar": a calendar file with one event when the duel closes. Works on every phone,
// with no sign-up and no notification permission. Only for duels that have an end time.
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const esc = (s: string) => s.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/[\r\n]+/g, ' ');

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const poll = await getPoll(await getDb(), id, null);
  if (!poll?.endsAt) return new Response('Not found', { status: 404 });
  const end = new Date(poll.endsAt);
  const url = `${new URL(req.url).origin}/p/${poll.id}`;
  const t = await getT();
  const body = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Chunav//Result day//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${poll.id}@election`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(end)}`,
    `DTEND:${stamp(new Date(end.getTime() + 15 * 60_000))}`,
    `SUMMARY:${esc(t.calTitle(poll.title))}`,
    `DESCRIPTION:${esc(t.calNote(url))}`,
    `URL:${url}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${esc(t.calTitle(poll.title))}`,
    'TRIGGER:PT0M',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  return new Response(body, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="result-${poll.id}.ics"`,
      'Cache-Control': 'private, max-age=300', // in the visitor's language
    },
  });
}
