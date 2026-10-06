import { ImageResponse } from 'next/og';
import { markDataUri } from '@/lib/brandMark';
import { CARD, cardFonts } from '@/lib/cards';
import { cardDict } from '@/lib/i18n';

// The brand link preview (1200x630), for the bare site link and every page without a picture of its own
// (src/lib/og.ts). What it is (the question we answer, in one big line), why it is safe and quick (three points), and
// one ink button, as on the site. The big mark on the right is what people remember. English or Hinglish (?l=hg).
// Chat apps may crop to a square around the centre, so the words sit left of centre and the mark right of it.
export async function GET(req: Request) {
  const t = cardDict(new URL(req.url).searchParams.get('l'));
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', background: CARD.paper, color: CARD.ink, fontFamily: 'Figtree' }}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '56px 48px 56px 64px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ display: 'flex', fontSize: 40, fontWeight: 700, letterSpacing: -1 }}>{t.siteName}</div>
            <div style={{ display: 'flex', padding: '6px 16px', borderRadius: 999, background: CARD.sand, color: CARD.muted, fontSize: 20, fontWeight: 700 }}>{t.cardFun}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center' }}>
            <div style={{ display: 'flex', fontSize: 80, fontWeight: 700, letterSpacing: -2.5, lineHeight: 1.02 }}>{t.splashLine}</div>
            <div style={{ display: 'flex', marginTop: 20, fontSize: 30, color: CARD.muted, lineHeight: 1.3 }}>{t.ogSiteLine}</div>
            <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
              {t.ogPoints.map((p) => (
                <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px', borderRadius: 999, background: CARD.white, border: `2px solid ${CARD.sand}`, fontSize: 24, fontWeight: 700 }}>
                  <div style={{ display: 'flex', width: 12, height: 12, borderRadius: 6, background: CARD.lime }} />
                  {p}
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '18px 32px', borderRadius: 999, background: CARD.ink, color: CARD.paper, fontSize: 32, fontWeight: 700 }}>
              {t.ogStart}
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={CARD.lime} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', width: 430, alignItems: 'center', justifyContent: 'center', background: CARD.lime }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={markDataUri(400, false)} width={400} height={400} alt="" />
        </div>
      </div>
    ),
    { width: 1200, height: 630, fonts: await cardFonts(), headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800' } },
  );
}
