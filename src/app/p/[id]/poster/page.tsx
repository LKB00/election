import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import QRCode from 'qrcode';
import LogoMark from '@/components/LogoMark';
import PrintButton from '@/components/PrintButton';
import { getDb } from '@/db';
import { faceLabels } from '@/lib/labels';
import { getT } from '@/lib/lang-server';
import { PALETTE } from '@/lib/palette';
import { getPoll } from '@/lib/polls';
import { RATING_EMOJIS } from '@/lib/rating';
import { SITE_URL } from '@/lib/site';

export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const poll = await getPoll(await getDb(), (await params).id, null);
  const t = await getT();
  return { title: poll ? `${t.posterRow} · ${poll.title}` : t.notFound, robots: { index: false, follow: false } };
}

// The poster (docs/DESIGN.md, "QR poster"): a page to print or save as a PDF for a shop counter, notice board or event.
// The question, its choices and a big QR code to vote. Always the light colours (paper is white), whatever the phone's
// setting: the page sets the light values from palette.ts on itself. Never shows any numbers.
export default async function PosterPage({ params }: Props) {
  const { id } = await params;
  const poll = await getPoll(await getDb(), id, null);
  if (!poll) notFound();
  const t = await getT();
  const link = `${SITE_URL}/p/${poll.id}`;
  const qr = await QRCode.toDataURL(`${link}?src=qr`, { margin: 1, width: 640, color: { dark: PALETTE.ink, light: PALETTE.white } });
  const faces = faceLabels(poll.options.map((o) => o.label));
  const light = { '--paper': PALETTE.paper, '--card': PALETTE.white, '--ink': PALETTE.ink, '--ink-2': PALETTE.muted, '--sand': PALETTE.sand } as React.CSSProperties;
  return (
    <div className="page poster-page">
      <p className="poster-tools"><PrintButton label={t.posterPrint} /></p>
      <article className="poster" style={light}>
        <p className="poster-brand"><LogoMark size={28} /> <span>{t.siteName}</span></p>
        <h1 className="poster-q">{poll.title}</h1>
        {poll.kind === 'rating' ? (
          <p className="poster-faces" aria-hidden>{RATING_EMOJIS.join(' ')}</p>
        ) : (
          <ul className="poster-choices">
            {poll.options.map((o, i) => (
              <li key={o.id}>
                <span className="poster-disc" aria-hidden>{o.imageUrl ? <img src={o.imageUrl} alt="" /> : o.emoji || faces[i]}</span>
                {o.isOther ? t.otherChoice : o.label}
              </li>
            ))}
          </ul>
        )}
        <div className="poster-qr">
          <img src={qr} alt="" width={320} height={320} />
          <p className="poster-scan">{t.tvScan}</p>
          <p className="poster-link">{t.tvOr} {link.replace(/^https?:\/\//, '')}</p>
        </div>
        <p className="poster-note">{t.ballotHint}</p>
      </article>
    </div>
  );
}
