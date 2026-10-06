import { ImageResponse } from 'next/og';
import { markDataUri } from '@/lib/brandMark';
import QRCode from 'qrcode';
import { handDataUri } from '@/lib/inkHand';
import { getDb } from '@/db';
import { CARD, cardFonts, faceLabels, friendsFromCode, pickFromCode } from '@/lib/cards';
import { clip, drawable } from '@/lib/labels';
import { isShareProof } from '@/lib/secret';
import { getPoll, groupSplit } from '@/lib/polls';
import { cardDict, isLang } from '@/lib/i18n';
import { MAX_CARD_NAME } from '@/lib/limits';
import { hasBlockedWord } from '@/lib/moderation';
import { cleanText } from '@/lib/validation';

export const dynamic = 'force-dynamic';

// The "I voted" story image (1080x1920) for WhatsApp Status and Instagram Stories.
// Links cannot be tapped there, so it carries a small QR code in the corner ("Scan to vote").
// ?s=1 = secret ballot: both faces, "Guess who I picked?". Otherwise the pick is marked.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(req.url);
  const f = url.searchParams.get('f');
  // The pick shows only on an open link (it carries the sender's proof), never on a secret one.
  const proof = url.searchParams.get('o');
  const secret = url.searchParams.get('s') === '1' || !isShareProof(f, proof);
  // Images are English or Hinglish: the image renderer cannot join Hindi letters (the message and link title are Hindi).
  const lang = url.searchParams.get('l');
  const t = cardDict(lang);
  // The sender's own name on the picture ("Lokesh voted"), if they typed one: cleaned, short, drawable, polite.
  const rawName = cleanText(url.searchParams.get('n') ?? '').slice(0, MAX_CARD_NAME);
  const name = rawName && drawable(rawName) && !hasBlockedWord(rawName) ? rawName : '';
  const db = await getDb();
  const poll = await getPoll(db, id, null);
  if (!poll) return new Response('Not found', { status: 404 });
  const pickId = await pickFromCode(db, id, f);
  const showPick = !!pickId && !secret;
  const target = `${url.origin}/p/${id}${f ? `?f=${encodeURIComponent(f)}${secret ? '&s=1' : `&o=${proof}`}${isLang(lang) && lang !== 'en' ? `&l=${lang}` : ''}&src=qr` : '?src=qr'}`;
  const qr = await QRCode.toDataURL(target, { margin: 1, width: 300, color: { dark: CARD.ink, light: CARD.white } });
  const abs = (src: string) => new URL(src, url.origin).toString();
  // A rating poll shows its five faces (smaller); other polls their first two choices.
  const rating = poll.kind === 'rating';
  const shown = rating ? poll.options : poll.options.slice(0, 2);
  // Same letters as on the ballot (worked out over all choices), or the creator's emoji.
  const faces = faceLabels(poll.options.map((o) => o.label)).map((f, n) => poll.options[n].emoji ?? (drawable(f) ? f : String(n + 1)));
  const pick = shown.find((o) => o.id === pickId);
  // The social line (P2): how many friends came through your link and agree with you. No spoiler of who leads.
  // Only on an open link to a result anyone may already see: on a secret link, a hidden or sealed result, "agree"
  // going up after a friend votes would tell them the sender's pick (and how the sender's friends split).
  const friends = showPick && poll.resultsVisible && !poll.sealedUntil ? await friendsFromCode(db, id, f, pickId) : { all: 0, agree: 0 };
  // My group vs everyone, only where the result is already public to anyone (results not hidden, or the poll ended;
  // getPoll with no voter says so) and your pick shows: then the image gives nothing away.
  const picked = poll.options.find((o) => o.id === pickId);
  const group =
    showPick && poll.resultsVisible && poll.kind === 'choice' && picked && drawable(picked.label)
      ? groupSplit(friends.all, friends.agree, picked.votes, poll.totalVotes)
      : null;

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '88px 72px 72px', background: CARD.paper, color: CARD.ink, fontFamily: 'Figtree' }}>
        <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', fontSize: 40, fontWeight: 700 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={markDataUri(48)} width={48} height={48} alt="" />
            {t.siteName}
          </div>
          <div style={{ display: 'flex', padding: '10px 24px', borderRadius: 999, background: CARD.lime, fontSize: 30 }}>{t.cardFun}</div>
        </div>

        {/* Who voted (your name if you added it) next to the inked finger, and how many have voted so far. */}
        <div style={{ display: 'flex', width: '100%', alignItems: 'center', gap: 32, marginTop: 64 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={handDataUri(150)} width={150} height={195} alt="" />
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div style={{ display: 'flex', fontSize: name ? 92 : 112, fontWeight: 700, letterSpacing: -3, lineHeight: 1.05 }}>{name ? t.cardNameVoted(name) : t.cardVoted}</div>
            {poll.participants > 0 && <div style={{ display: 'flex', marginTop: 12, fontSize: 40, color: CARD.muted }}>{t.cardVotersN(poll.participants)}</div>}
          </div>
        </div>

        {/* The space is shared out evenly above and below the question and ballot (no big empty gap). */}
        <div style={{ display: 'flex', flex: 1, minHeight: 40 }} />
        {/* The question is the hero: big, on a white card. */}
        {drawable(poll.title) && (
          <div style={{ display: 'flex', width: '100%', padding: '44px 48px', borderRadius: 40, background: CARD.white, fontSize: poll.title.length > 60 ? 62 : 78, fontWeight: 700, lineHeight: 1.15, letterSpacing: -1 }}>
            {clip(poll.title, 90)}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', marginTop: 32, padding: 32, borderRadius: 40, background: CARD.sand }}>
          <div style={{ display: 'flex', gap: rating ? 12 : 28 }}>
            {shown.map((o, n) => {
              const mine = showPick && o.id === pickId;
              return (
                <div key={o.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: rating ? 156 : 400, padding: 24, borderRadius: 28, background: mine ? CARD.tints[n % CARD.tints.length] : CARD.white, border: mine ? `6px solid ${CARD.ink}` : '6px solid transparent', opacity: showPick && !mine ? 0.55 : 1 }}>
                  {o.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={abs(o.imageUrl)} width={330} height={380} style={{ borderRadius: 20, objectFit: 'cover' }} alt="" />
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: rating ? 120 : 290, height: rating ? 120 : 290, borderRadius: 150, background: CARD.tints[n % CARD.tints.length], fontSize: rating ? 72 : o.emoji ? 130 : 100, fontWeight: 700 }}>{faces[n]}</div>
                  )}
                  {!rating && drawable(o.label) && <div style={{ display: 'flex', marginTop: 20, fontSize: 44, fontWeight: 700 }}>{clip(o.label, 18)}</div>}
                  {mine && <div style={{ display: 'flex', marginTop: 8, fontSize: 32, fontWeight: 700, color: CARD.green, letterSpacing: 2 }}>{t.cardMyVote}</div>}
                </div>
              );
            })}
          </div>
          {/* Secret: a seal across the ballot, then the dare. Open: your pick in words. */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 28 }}>
            {!showPick && <div style={{ display: 'flex', padding: '10px 24px', borderRadius: 999, background: CARD.ink, color: CARD.paper, fontSize: 30, fontWeight: 700, letterSpacing: 2 }}>{t.cardSecret.toUpperCase()}</div>}
            <div style={{ display: 'flex', fontSize: 52, fontWeight: 700 }}>
              {showPick && pick ? t.cardPicked(rating ? pick.emoji ?? pick.label : drawable(pick.label) ? pick.label : String(poll.options.indexOf(pick) + 1)) : t.cardGuess}
            </div>
          </div>
        </div>
        {(group || friends.all > 0) && (
          <div style={{ display: 'flex', marginTop: 24, padding: '14px 28px', borderRadius: 999, background: CARD.lime, fontSize: 36, fontWeight: 700 }}>
            {group && picked ? t.cardGroup(group.mine, clip(picked.label, 18), group.everyone) : t.cardFriends(friends.all, friends.agree)}
          </div>
        )}

        <div style={{ display: 'flex', flex: 1, minHeight: 40 }} />
        <div style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between', padding: 32, borderRadius: 40, background: CARD.lime }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', fontSize: 60, fontWeight: 700, letterSpacing: -1 }}>{t.cardYourTurn}</div>
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
