import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import QRCode from 'qrcode';
import PackTv from '@/components/PackTv';
import { getDb } from '@/db';
import { getT } from '@/lib/lang-server';
import { getPack } from '@/lib/packs';
import { PALETTE } from '@/lib/palette';
import { SITE_URL } from '@/lib/site';

export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const pack = await getPack(await getDb(), (await params).id, null);
  const t = await getT();
  return { title: pack ? pack.title : t.notFound, robots: { index: false, follow: false } };
}

// A pack on the big screen (docs/DESIGN.md, "Poll night"): one question at a time, the presenter steps through them
// (buttons or ← →). The QR code opens the whole pack on phones, so the room votes along. Always the public view.
export default async function PackTvPage({ params }: Props) {
  const { id } = await params;
  const pack = await getPack(await getDb(), id, null);
  if (!pack) notFound();
  const link = `${SITE_URL}/pack/${pack.id}`;
  const qr = await QRCode.toDataURL(`${link}?src=qr`, { margin: 1, width: 480, color: { dark: PALETTE.ink, light: PALETTE.white } });
  return <PackTv polls={pack.views} qr={qr} link={link.replace(/^https?:\/\//, '')} host={SITE_URL.replace(/^https?:\/\//, '')} />;
}
