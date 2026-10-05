import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import QRCode from 'qrcode';
import TvScreen from '@/components/TvScreen';
import { getDb } from '@/db';
import { getT } from '@/lib/lang-server';
import { PALETTE } from '@/lib/palette';
import { getPoll } from '@/lib/polls';
import { SITE_URL } from '@/lib/site';

export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const poll = await getPoll(await getDb(), (await params).id, null);
  const t = await getT();
  return { title: poll ? poll.title : t.notFound, robots: { index: false, follow: false } };
}

// The big screen (docs/DESIGN.md, "Big screen"): a poll on a TV or projector for a class, an office or a watch party.
// Always the public view (no voter), so hidden results stay hidden even if the presenter has voted. The QR code
// carries the poll's own link (src=qr counts where votes came from, as on the story image).
export default async function TvPage({ params }: Props) {
  const { id } = await params;
  const poll = await getPoll(await getDb(), id, null);
  if (!poll) notFound();
  const link = `${SITE_URL}/p/${poll.id}`;
  const qr = await QRCode.toDataURL(`${link}?src=qr`, { margin: 1, width: 480, color: { dark: PALETTE.ink, light: PALETTE.white } });
  return <TvScreen initial={poll} qr={qr} link={link.replace(/^https?:\/\//, '')} />;
}
