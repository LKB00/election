import { ImageResponse } from 'next/og';
import { markDataUri } from '@/lib/brandMark';
import { handDataUri } from '@/lib/inkHand';
import { getDb } from '@/db';
import { CARD, cardFonts, faceLabels, pickFromCode } from '@/lib/cards';
import { clip, drawable } from '@/lib/labels';
import { isShareProof } from '@/lib/secret';
import { getPoll } from '@/lib/polls';
import { cardDict } from '@/lib/i18n';
import { OG_VOTERS_MIN } from '@/lib/limits';

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
  // A rating poll shows its five faces; other polls their first two choices.
  const rating = poll.kind === 'rating';
  const shown = rating ? poll.options : poll.options.slice(0, 2);
  // Same letters as on the ballot (worked out over all choices), or the creator's emoji.
  const faces = faceLabels(poll.options.map((o) => o.label)).map((f, n) => poll.options[n].emoji ?? (drawable(f) ? f : String(n + 1)));
  const headline = !voted ? (rating ? t.ogRate : t.ogAsk) : showPick && pick ? t.ogPicked(rating ? pick.emoji ?? pick.label : drawable(pick.label) ? pick.label : String(poll.options.indexOf(pick) + 1)) : t.ogGuess;

  // A crowd makes people tap; the count of people is public (never the split).
  const crowd = poll.participants >= OG_VOTERS_MIN ? t.cardVotersN(poll.participants) : null;
  const more = rating ? 0 : poll.options.length - shown.length;
  const choice = (o: (typeof shown)[number], n: number) => {
    const mine = showPick && o.id === pickId;
    return (
      <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 12, paddingRight: 24, borderRadius: 24, background: mine ? CARD.tints[n % CARD.tints.length] : CARD.white, border: mine ? `4px solid ${CARD.ink}` : `3px solid ${CARD.sand}`, opacity: showPick && !mine ? 0.6 : 1 }}>
        {o.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={abs(o.imageUrl)} width={rating ? 84 : 104} height={rating ? 84 : 104} style={{ borderRadius: 16, objectFit: 'cover' }} alt="" />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: rating ? 84 : 104, height: rating ? 84 : 104, borderRadius: 52, background: CARD.tints[n % CARD.tints.length], fontSize: o.emoji || rating ? 52 : 40, fontWeight: 700 }}>{faces[n]}</div>
        )}
        {(mine || (!rating && drawable(o.label))) && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {mine && <div style={{ display: 'flex', fontSize: 18, fontWeight: 700, color: CARD.green, letterSpacing: 1 }}>{t.cardMyVote}</div>}
            {!rating && drawable(o.label) && <div style={{ display: 'flex', fontSize: 30, fontWeight: 700 }}>{clip(o.label, 15)}</div>}
          </div>
        )}
      </div>
    );
  };

  // Top: the brand. Middle: the question, big (P1), and its choices with a VS between two. Bottom: an ink band that
  // reads like the site's main button: what to do (or the sender's "I voted" line) and a yellow Vote now pill.
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding: '40px 48px 40px', background: CARD.paper, color: CARD.ink, fontFamily: 'Figtree' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 32, fontWeight: 700, letterSpacing: -0.5 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={markDataUri(48)} width={48} height={48} alt="" />
            {t.siteName}
          </div>
          <div style={{ display: 'flex', padding: '6px 16px', borderRadius: 999, background: CARD.sand, color: CARD.muted, fontSize: 20, fontWeight: 700 }}>{t.cardFun}</div>
        </div>
        <div style={{ display: 'flex', flex: 1, alignItems: 'center', gap: 32 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {voted && <img src={handDataUri(140)} width={140} height={182} alt="" />}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            {voted && <div style={{ display: 'flex', fontSize: 26, fontWeight: 700, color: CARD.green, letterSpacing: 2 }}>{t.ogVoted}</div>}
            {drawable(poll.title) && <div style={{ display: 'flex', fontSize: poll.title.length > 44 ? 52 : 62, fontWeight: 700, letterSpacing: -1.5, lineHeight: 1.08 }}>{clip(poll.title, 70)}</div>}
            <div style={{ display: 'flex', alignItems: 'center', gap: rating ? 12 : 18, marginTop: 24 }}>
              {shown.map((o, n) => (
                <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                  {n === 1 && !rating && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: 28, background: CARD.ink, color: CARD.lime, fontSize: 22, fontWeight: 700 }}>{t.ogVs}</div>}
                  {choice(o, n)}
                </div>
              ))}
              {more > 0 && <div style={{ display: 'flex', padding: '10px 18px', borderRadius: 999, background: CARD.sand, color: CARD.muted, fontSize: 24, fontWeight: 700 }}>{t.ogMore(more)}</div>}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, padding: '20px 20px 20px 32px', borderRadius: 28, background: CARD.ink, color: CARD.paper }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', fontSize: 32, fontWeight: 700 }}>{headline}</div>
            <div style={{ display: 'flex', fontSize: 21, color: CARD.sand, opacity: 0.75 }}>{crowd ? `${crowd} · ${t.cardSecret}` : t.ogSecretLine}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 28px', borderRadius: 999, background: CARD.lime, color: CARD.ink, fontSize: 30, fontWeight: 700 }}>
            {voted ? t.cardYourTurn : t.ogVoteNow}
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={CARD.ink} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630, fonts: await cardFonts(), // Cached by Vercel's network for an hour, so WhatsApp gets the preview fast (it gives up on slow ones).
      headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' } },
  );
}
