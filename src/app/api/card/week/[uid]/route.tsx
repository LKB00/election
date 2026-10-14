import { eq } from 'drizzle-orm';
import { ImageResponse } from 'next/og';
import QRCode from 'qrcode';
import { getDb, schema } from '@/db';
import { markDataUri } from '@/lib/brandMark';
import { CARD, cardFonts } from '@/lib/cards';
import { cardDict } from '@/lib/i18n';
import { clip, drawable } from '@/lib/labels';
import { creatorWeek } from '@/lib/profiles';

export const dynamic = 'force-dynamic';

// "Your week" (docs/DESIGN.md, "Your week"): a poll maker's story picture (1080x1920) of their last 7 days: votes in
// (the hero), new polls, the poll with the most votes, and a QR code to their profile page so people vote on more.
// Only public polls count (creatorWeek), so the address (a profile id, already on /u/<id>) gives nothing away.
export async function GET(req: Request, { params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  const url = new URL(req.url);
  const t = cardDict(url.searchParams.get('l'));
  const db = await getDb();
  const [user] = await db.select({ name: schema.users.name, avatar: schema.users.avatar }).from(schema.users).where(eq(schema.users.id, uid)).limit(1);
  if (!user) return new Response('Not found', { status: 404 });
  const week = await creatorWeek(db, uid);
  const qr = await QRCode.toDataURL(`${url.origin}/u/${uid}?src=qr`, { margin: 1, width: 300, color: { dark: CARD.ink, light: CARD.white } });
  const name = drawable(user.name) ? clip(user.name, 24) : '';
  const big = (n: number) => n.toLocaleString('en-IN');

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding: '88px 72px 72px', background: CARD.paper, color: CARD.ink, fontFamily: 'Figtree' }}>
        <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', fontSize: 40, fontWeight: 700 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={markDataUri(48)} width={48} height={48} alt="" />
            {t.siteName}
          </div>
          <div style={{ display: 'flex', padding: '10px 24px', borderRadius: 999, background: CARD.lime, fontSize: 30 }}>{t.cardFun}</div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 28, marginTop: 72 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 150, height: 150, borderRadius: 150, background: CARD.lime, fontSize: 90 }}>{user.avatar}</div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', fontSize: 104, fontWeight: 700, letterSpacing: -3, lineHeight: 1.05 }}>{t.cardWeekTitle}</div>
            {name && <div style={{ display: 'flex', marginTop: 8, fontSize: 44, color: CARD.muted }}>{name}</div>}
          </div>
        </div>

        <div style={{ display: 'flex', flex: 1, minHeight: 40 }} />
        {/* The hero: votes that came in this week. */}
        <div style={{ display: 'flex', flexDirection: 'column', padding: '48px 56px', borderRadius: 40, background: CARD.white }}>
          <div style={{ display: 'flex', fontSize: 220, fontWeight: 700, letterSpacing: -8, lineHeight: 1 }}>{big(week.votes)}</div>
          <div style={{ display: 'flex', marginTop: 12, fontSize: 52, fontWeight: 700 }}>{t.cardWeekVotes(week.votes)}</div>
        </div>
        <div style={{ display: 'flex', gap: 28, marginTop: 28 }}>
          <div style={{ display: 'flex', flexDirection: 'column', width: 300, padding: '36px 40px', borderRadius: 40, background: CARD.sand }}>
            <div style={{ display: 'flex', fontSize: 110, fontWeight: 700, lineHeight: 1 }}>{big(week.made)}</div>
            <div style={{ display: 'flex', marginTop: 8, fontSize: 40 }}>{t.cardWeekMade(week.made)}</div>
          </div>
          {week.top && drawable(week.top.title) && (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '36px 40px', borderRadius: 40, background: CARD.tints[0] }}>
              <div style={{ display: 'flex', fontSize: 32, fontWeight: 700, color: CARD.muted }}>{t.cardWeekTop(week.top.votes)}</div>
              <div style={{ display: 'flex', marginTop: 12, fontSize: 48, fontWeight: 700, lineHeight: 1.15 }}>{clip(week.top.title, 60)}</div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flex: 1, minHeight: 40 }} />
        <div style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between', padding: 32, borderRadius: 40, background: CARD.lime }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', fontSize: 56, fontWeight: 700, letterSpacing: -1 }}>{t.cardWeekCta}</div>
            <div style={{ display: 'flex', fontSize: 36, marginTop: 4 }}>{t.cardScan} · {url.host}</div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} width={210} height={210} style={{ borderRadius: 16 }} alt="" />
        </div>
      </div>
    ),
    { width: 1080, height: 1920, fonts: await cardFonts(), headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' } },
  );
}
