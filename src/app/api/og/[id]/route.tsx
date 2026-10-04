import { ImageResponse } from 'next/og';
import { handDataUri } from '@/lib/inkHand';
import { getDb } from '@/db';
import { CARD, cardFonts, faceLabels, pickFromCode } from '@/lib/cards';
import { clip, drawable } from '@/lib/labels';
import { isShareProof } from '@/lib/secret';
import { getPoll } from '@/lib/polls';
import { cardDict } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

// The WhatsApp / X link preview (1200x630). The link is already tappable there, so no QR code.
// From a friend's "Show your ink" link (?f=): the drawn inked finger + "I voted" + their pick or "Guess who I picked?".
// Never the split, so friends still have to vote to see it.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(req.url);
  const f = url.searchParams.get('f');
  // The pick shows only on an open link (it carries the sender's proof). Removing "&s=1" from a secret one shows nothing.
  const secret = url.searchParams.get('s') === '1' || !isShareProof(f, url.searchParams.get('o'));
  const t = cardDict(url.searchParams.get('l')); // English or Hinglish: the image renderer cannot join Hindi letters correctly.
  const db = await getDb();
  const poll = await getPoll(db, id, null);
  if (!poll) return new Response('Not found', { status: 404 });
  const pickId = await pickFromCode(db, id, f);
  const voted = !!pickId;
  const showPick = voted && !secret;
  const pick = poll.options.find((o) => o.id === pickId);
  const abs = (src: string) => new URL(src, url.origin).toString();
  const shown = poll.options.slice(0, 2);
  // Same letters as on the ballot (worked out over all choices), or the creator's emoji.
  const faces = faceLabels(poll.options.map((o) => o.label)).map((f, n) => poll.options[n].emoji ?? (drawable(f) ? f : String(n + 1)));
  const headline = !voted ? t.ogAsk : showPick && pick ? t.ogPicked(drawable(pick.label) ? pick.label : String(poll.options.indexOf(pick) + 1)) : t.ogGuess;

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding: 48, background: CARD.paper, color: CARD.ink, fontFamily: 'Lato' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 26, fontWeight: 700 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', width: 26, height: 26, borderRadius: 13, background: CARD.ink, border: `7px solid ${CARD.lime}` }} />
            Election
          </div>
          <div style={{ display: 'flex', padding: '6px 16px', borderRadius: 999, background: CARD.lime, fontSize: 22 }}>{t.cardFun}</div>
        </div>
        <div style={{ display: 'flex', flex: 1, alignItems: 'center', gap: 32, marginTop: 16 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {voted && <img src={handDataUri(150)} width={150} height={195} alt="" />}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            {voted && <div style={{ display: 'flex', fontSize: 30, fontWeight: 700, color: CARD.green, letterSpacing: 2 }}>{t.ogVoted}</div>}
            {drawable(poll.title) && <div style={{ display: 'flex', fontSize: 58, fontWeight: 700, letterSpacing: -1, lineHeight: 1.1 }}>{clip(poll.title, 50)}</div>}
            <div style={{ display: 'flex', gap: 16, marginTop: 24 }}>
              {shown.map((o, n) => {
                const mine = showPick && o.id === pickId;
                return (
                  <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 12, paddingRight: 24, borderRadius: 20, background: mine ? CARD.tints[n] : '#ffffff', border: mine ? `4px solid ${CARD.ink}` : `4px solid ${CARD.sand}`, opacity: showPick && !mine ? 0.6 : 1 }}>
                    {o.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={abs(o.imageUrl)} width={120} height={150} style={{ borderRadius: 12, objectFit: 'cover' }} alt="" />
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 120, height: 120, borderRadius: 60, background: CARD.tints[n], fontSize: 44, fontWeight: 700 }}>{faces[n]}</div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {mine && <div style={{ display: 'flex', fontSize: 20, fontWeight: 700, color: CARD.green, letterSpacing: 1 }}>{t.cardMyVote}</div>}
                      {drawable(o.label) && <div style={{ display: 'flex', fontSize: 32, fontWeight: 700 }}>{clip(o.label, 16)}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', fontSize: 34, fontWeight: 700 }}>{headline}</div>
      </div>
    ),
    { width: 1200, height: 630, fonts: await cardFonts(), // Cached by Vercel's network for an hour, so WhatsApp gets the preview fast (it gives up on slow ones).
      headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' } },
  );
}
