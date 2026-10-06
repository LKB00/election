import { ImageResponse } from 'next/og';
import { markDataUri } from '@/lib/brandMark';
import QRCode from 'qrcode';
import { getDb } from '@/db';
import { CARD, cardFonts, faceLabels } from '@/lib/cards';
import { clip, drawable } from '@/lib/labels';
import { getPoll } from '@/lib/polls';
import { cardDict } from '@/lib/i18n';
import { sharesAddUp, wholePercents } from '@/lib/percent';
import { ratingAverage, ratingEmoji } from '@/lib/rating';

export const dynamic = 'force-dynamic';

// "Results are in" (docs/DESIGN.md, "Poll maker tools"): the story image (1080x1920) the maker posts back to the group
// or their Status once the result is public. Numbers only: no names, no free text. Only when anyone may already see the
// result (getPoll with no voter: open results, or the poll has ended); hidden and sealed results never make an image.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(req.url);
  const t = cardDict(url.searchParams.get('l'));
  const poll = await getPoll(await getDb(), id, null);
  if (!poll || !poll.resultsVisible || !poll.participants || poll.groupWaiting) return new Response('Not found', { status: 404 });
  const target = `${url.origin}/p/${id}?src=qr`;
  const qr = await QRCode.toDataURL(target, { margin: 1, width: 300, color: { dark: CARD.ink, light: CARD.white } });
  const faces = faceLabels(poll.options.map((o) => o.label)).map((f, n) => poll.options[n].emoji ?? (drawable(f) ? f : String(n + 1)));
  const rows = poll.options.map((o, n) => ({ o, n, face: faces[n] })).sort((a, b) => b.o.percent - a.o.percent || b.o.maybe - a.o.maybe).slice(0, 5);
  const avg = poll.kind === 'rating' ? ratingAverage(poll.options.map((o) => o.votes)) : null;
  const top = rows[0];
  // Pick-one shares add up to 100 (as on the poll page); others are rounded one by one.
  const whole = sharesAddUp(poll.kind) ? wholePercents(poll.options.map((o) => o.percent)) : poll.options.map((o) => Math.round(o.percent));
  const pctOf = (id: string) => whole[poll.options.findIndex((o) => o.id === id)] ?? 0;
  const headline =
    poll.kind === 'rating' && avg != null ? t.cardAverage(ratingEmoji(avg), avg.toFixed(1))
    : poll.kind === 'dates' && top && drawable(top.o.label) ? t.cardBestDate(clip(top.o.label, 22))
    : top && drawable(top.o.label) ? t.cardLeader(clip(top.o.label, 22), pctOf(top.o.id))
    : t.cardResultsIn;

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding: '96px 72px 72px', background: CARD.paper, color: CARD.ink, fontFamily: 'Figtree' }}>
        <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', fontSize: 40, fontWeight: 700 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={markDataUri(48)} width={48} height={48} alt="" />
            {t.siteName}
          </div>
          <div style={{ display: 'flex', padding: '10px 24px', borderRadius: 999, background: CARD.lime, fontSize: 30 }}>{t.cardResultsIn}</div>
        </div>
        {drawable(poll.title) && <div style={{ display: 'flex', marginTop: 96, fontSize: 64, fontWeight: 700, lineHeight: 1.15 }}>{clip(poll.title, 70)}</div>}
        <div style={{ display: 'flex', marginTop: 24, fontSize: 44, color: CARD.muted }}>{t.cardVoters(poll.participants)}</div>
        <div style={{ display: 'flex', marginTop: 56, fontSize: 76, fontWeight: 700, letterSpacing: -2, lineHeight: 1.1 }}>{headline}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginTop: 56, padding: 32, borderRadius: 40, background: CARD.sand }}>
          {rows.map(({ o, n, face }, k) => {
            const pct = pctOf(o.id);
            return (
              <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 24, padding: 20, borderRadius: 28, background: CARD.white, border: k === 0 ? `6px solid ${CARD.ink}` : '6px solid transparent' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 96, height: 96, borderRadius: 48, background: CARD.tints[n % CARD.tints.length], fontSize: o.emoji ? 56 : 44, fontWeight: 700 }}>{face}</div>
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 40, fontWeight: 700 }}>
                    <span>{drawable(o.label) ? clip(o.label, 20) : String(n + 1)}</span>
                    <span>{poll.kind === 'rating' ? t.cardVotesN(o.votes) : `${pct}%`}</span>
                  </div>
                  <div style={{ display: 'flex', width: '100%', height: 20, borderRadius: 10, background: CARD.sand }}>
                    <div style={{ display: 'flex', width: `${Math.max(2, pct)}%`, height: 20, borderRadius: 10, background: k === 0 ? CARD.ink : CARD.muted }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', flex: 1, minHeight: 48 }} />
        <div style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', fontSize: 44, fontWeight: 700 }}>{t.cardSeeAll}</div>
            <div style={{ display: 'flex', fontSize: 30, color: CARD.muted }}>{url.host}</div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} width={200} height={200} style={{ borderRadius: 16 }} alt="" />
        </div>
      </div>
    ),
    { width: 1080, height: 1920, fonts: await cardFonts(), headers: { 'Cache-Control': 'public, max-age=120, s-maxage=300' } },
  );
}
