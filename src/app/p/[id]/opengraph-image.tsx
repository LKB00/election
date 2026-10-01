import { ImageResponse } from 'next/og';
import { getDb } from '@/db';
import { getPoll } from '@/lib/polls';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Election poll';
export const dynamic = 'force-dynamic';

// The share card: shown when the link is pasted in WhatsApp, X, Slack, etc.
export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const poll = await getPoll(await getDb(), (await params).id, null);
  const title = poll?.title ?? 'Election';
  // Numbers appear on the card only if the organiser did not hide them.
  const show = poll?.resultsVisible && poll.totalVotes > 0;
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 64, background: '#fbfbf7', color: '#24282c', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', fontSize: 28, fontWeight: 700 }}>● Election</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          <div style={{ display: 'flex', fontSize: 64, fontWeight: 800, lineHeight: 1.1 }}>{title.slice(0, 90)}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
            {(poll?.options ?? []).slice(0, 5).map((o) => (
              <div key={o.id} style={{ display: 'flex', padding: '10px 22px', borderRadius: 999, background: '#f0eee3', fontSize: 30, fontWeight: 700 }}>
                {o.label.slice(0, 24)}{show ? ` · ${Math.round(o.percent)}%` : ''}
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', fontSize: 26, color: '#5b5e61' }}>Tap to vote · Just for fun</div>
      </div>
    ),
    size,
  );
}
