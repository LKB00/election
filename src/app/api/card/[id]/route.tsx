import { ImageResponse } from 'next/og';
import QRCode from 'qrcode';
import { INK_CREDIT, INK_PHOTO } from '@/components/InkFinger';
import { getDb } from '@/db';
import { CARD, cardFonts, initialsOf, pickFromCode } from '@/lib/cards';
import { getPoll } from '@/lib/polls';
import { dict } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

// The "I voted" story image (1080x1920) for WhatsApp Status and Instagram Stories.
// Links cannot be tapped there, so it carries a small QR code in the corner ("Scan to vote").
// ?s=1 = secret ballot: both faces, "Guess who I picked?". Otherwise the pick is marked.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(req.url);
  const f = url.searchParams.get('f');
  const secret = url.searchParams.get('s') === '1';
  // Images stay in English: the image renderer cannot join Hindi letters correctly (the message and link title are Hindi).
  const lang = url.searchParams.get('l') === 'hi' ? 'hi' : 'en';
  const t = dict.en;
  const db = await getDb();
  const poll = await getPoll(db, id, null);
  if (!poll) return new Response('Not found', { status: 404 });
  const pickId = await pickFromCode(db, id, f);
  const showPick = !!pickId && !secret;
  const target = `${url.origin}/p/${id}${f ? `?f=${encodeURIComponent(f)}${secret ? '&s=1' : ''}${lang === 'hi' ? '&l=hi' : ''}` : ''}`;
  const qr = await QRCode.toDataURL(target, { margin: 1, width: 300, color: { dark: CARD.ink, light: '#ffffff' } });
  const abs = (src: string) => new URL(src, url.origin).toString();
  const shown = poll.options.slice(0, 2);
  const pick = shown.find((o) => o.id === pickId);

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '96px 72px 72px', background: CARD.paper, color: CARD.ink, fontFamily: 'Lato' }}>
        <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', fontSize: 40, fontWeight: 700 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ display: 'flex', width: 40, height: 40, borderRadius: 20, background: CARD.ink, border: `10px solid ${CARD.lime}` }} />
            Election
          </div>
          <div style={{ display: 'flex', padding: '10px 24px', borderRadius: 999, background: CARD.lime, fontSize: 30 }}>{t.cardFun}</div>
        </div>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={abs(INK_PHOTO)} width={240} height={300} style={{ marginTop: 64, borderRadius: 32, objectFit: 'cover', boxShadow: '0 16px 40px rgba(36,40,44,0.2)' }} alt="" />
        <div style={{ display: 'flex', marginTop: 40, fontSize: 132, fontWeight: 700, letterSpacing: -3 }}>{t.cardVoted}</div>
        <div style={{ display: 'flex', marginTop: 8, fontSize: 52, color: CARD.muted, textAlign: 'center' }}>{t.cardIn(poll.title.slice(0, 40))}</div>

        <div style={{ display: 'flex', gap: 32, marginTop: 56, padding: 32, borderRadius: 40, background: CARD.sand }}>
          {shown.map((o, n) => {
            const mine = showPick && o.id === pickId;
            return (
              <div key={o.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 380, padding: 24, borderRadius: 28, background: mine ? CARD.tints[n] : '#ffffff', border: mine ? `6px solid ${CARD.ink}` : '6px solid transparent', opacity: showPick && !mine ? 0.6 : 1 }}>
                {o.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={abs(o.imageUrl)} width={300} height={375} style={{ borderRadius: 20, objectFit: 'cover' }} alt="" />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 300, height: 300, borderRadius: 150, background: CARD.tints[n], fontSize: 110, fontWeight: 700 }}>{initialsOf(o.label)}</div>
                )}
                <div style={{ display: 'flex', marginTop: 20, fontSize: 44, fontWeight: 700 }}>{o.label.slice(0, 18)}</div>
                {mine && <div style={{ display: 'flex', marginTop: 8, fontSize: 32, fontWeight: 700, color: CARD.green, letterSpacing: 2 }}>{t.cardMyVote}</div>}
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', marginTop: 40, fontSize: 60, fontWeight: 700 }}>
          {showPick && pick ? t.cardPicked(pick.label) : t.cardGuess}
        </div>

        <div style={{ display: 'flex', flex: 1, minHeight: 48 }} />
        <div style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', fontSize: 44, fontWeight: 700 }}>{t.cardScan}</div>
            <div style={{ display: 'flex', fontSize: 30, color: CARD.muted }}>{url.host}</div>
            <div style={{ display: 'flex', fontSize: 18, color: CARD.muted, marginTop: 8 }}>Ink photo: {INK_CREDIT}</div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} width={200} height={200} style={{ borderRadius: 16 }} alt="" />
        </div>
      </div>
    ),
    { width: 1080, height: 1920, fonts: await cardFonts(), headers: { 'Cache-Control': 'public, max-age=300' } },
  );
}
