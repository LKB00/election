import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ImageResponse } from 'next/og';
import { getDb } from '@/db';
import { getPoll } from '@/lib/polls';
import { schema } from '@/db';
import { and, eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

// The WhatsApp / X preview for a duel link. With ?f=<share code> it says what the sender picked.
// It never shows the split, so friends still have to vote to see it.
const SIZE = { width: 1200, height: 630 };
const INK = '#24282c';
const PAPER = '#fbfbf7';
const SAND = '#f7f6f0';
const LIME = '#c2ef72';
const TINTS = ['#e5eef7', '#f6e8ec', '#eef3dc', '#f5efd8'];

const last = (label: string) => label.trim().split(/\s+/).pop() ?? label;
const initials = (label: string) => label.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('');

// The bundled Lato (woff, which the image renderer can read), so text is bold and matches the app.
const fontDir = path.join(process.cwd(), 'node_modules/@fontsource/lato/files');
const fonts = Promise.all([readFile(path.join(fontDir, 'lato-latin-400-normal.woff')), readFile(path.join(fontDir, 'lato-latin-700-normal.woff'))]);

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(req.url);
  const f = url.searchParams.get('f');
  const db = await getDb();
  const poll = await getPoll(db, id, null);
  if (!poll) return new Response('Not found', { status: 404 });

  // The sender's pick, from their share code (only the option, never who they are).
  let picked: string | null = null;
  if (f) {
    const [v] = await db.select({ optionId: schema.votes.optionId }).from(schema.votes).where(and(eq(schema.votes.pollId, id), eq(schema.votes.shareCode, f))).limit(1);
    picked = poll.options.find((o) => o.id === v?.optionId)?.label ?? null;
  }
  const abs = (src: string) => new URL(src, url.origin).toString();
  const shown = poll.options.slice(0, 2);
  const headline = picked ? `I picked ${last(picked)}. Who would you pick?` : 'Who would you pick? Tap to vote';

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding: 48, background: PAPER, color: INK, fontFamily: 'Lato' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 26, fontWeight: 700 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', width: 26, height: 26, borderRadius: 13, background: INK, border: `7px solid ${LIME}` }} />
            Election
          </div>
          <div style={{ display: 'flex', padding: '6px 16px', borderRadius: 999, background: LIME, fontSize: 22 }}>Fun duel · not official</div>
        </div>
        <div style={{ display: 'flex', marginTop: 20, fontSize: 56, fontWeight: 800, letterSpacing: -1 }}>{poll.title.slice(0, 60)}</div>
        <div style={{ display: 'flex', flex: 1, gap: 24, marginTop: 24, padding: 20, borderRadius: 28, background: SAND, position: 'relative' }}>
          {shown.map((o, n) => {
            const isPick = picked === o.label;
            return (
              <div key={o.id} style={{ display: 'flex', flex: 1, alignItems: 'center', gap: 20, padding: 16, borderRadius: 20, background: isPick ? TINTS[n] : '#ffffff', border: isPick ? `4px solid ${INK}` : '4px solid transparent' }}>
                {o.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={abs(o.imageUrl)} width={150} height={188} style={{ borderRadius: 14, objectFit: 'cover' }} alt="" />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 150, height: 150, borderRadius: 75, background: TINTS[n], fontSize: 56, fontWeight: 800 }}>{initials(o.label)}</div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {isPick && <div style={{ display: 'flex', fontSize: 22, fontWeight: 700, color: '#5a7a1f', letterSpacing: 1 }}>MY PICK</div>}
                  <div style={{ display: 'flex', fontSize: 40, fontWeight: 800, lineHeight: 1.1 }}>{o.label.slice(0, 22)}</div>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 20, fontSize: 32, fontWeight: 800 }}>{headline}</div>
      </div>
    ),
    {
      ...SIZE,
      fonts: (await fonts).map((data, n) => ({ name: 'Lato', data, weight: (n ? 700 : 400) as 400 | 700, style: 'normal' as const })),
      headers: { 'Cache-Control': 'public, max-age=300' },
    },
  );
}
