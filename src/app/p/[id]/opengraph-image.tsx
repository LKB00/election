import { ImageResponse } from 'next/og';
import { getDb } from '@/db';
import { getPoll } from '@/lib/polls';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Election poll';
export const dynamic = 'force-dynamic';

const COLORS = ['#6d5ef0', '#0fa38f'];
const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('');

// The share card shown when the link is pasted in WhatsApp, X, Slack, etc.
export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const poll = await getPoll(await getDb(), (await params).id, null);
  const duo = poll && poll.options.length === 2 ? poll.options : null;
  const show = !!poll?.resultsVisible && poll.totalVotes > 0;

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding: 56, background: '#fbfbf7', color: '#24282c', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 28, fontWeight: 700 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><div style={{ display: 'flex', width: 28, height: 28, borderRadius: 14, background: '#24282c', border: '7px solid #c2ef72' }} />Election</div>
          <div style={{ display: 'flex', color: '#707377', fontSize: 24 }}>Just for fun</div>
        </div>

        {duo ? (
          <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', gap: 40, position: 'relative' }}>
            {duo.map((o, i) => (
              <div key={o.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, padding: '36px 20px', borderRadius: 40, background: '#fff', border: `4px solid ${COLORS[i]}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 150, height: 150, borderRadius: 75, background: COLORS[i], color: '#fff', fontSize: 56, fontWeight: 800 }}>{initials(o.label)}</div>
                <div style={{ display: 'flex', marginTop: 22, fontSize: 40, fontWeight: 800, textAlign: 'center' }}>{o.label.slice(0, 22)}</div>
                {show && <div style={{ display: 'flex', marginTop: 6, fontSize: 64, fontWeight: 800, color: COLORS[i] }}>{Math.round(o.percent)}%</div>}
              </div>
            ))}
            <div style={{ position: 'absolute', left: 540, top: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 100, height: 100, borderRadius: 50, background: '#24282c', color: '#fbfbf7', fontSize: 34, fontWeight: 800, border: '8px solid #fbfbf7' }}>VS</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flex: 1, flexDirection: 'column', justifyContent: 'center', gap: 24 }}>
            <div style={{ display: 'flex', fontSize: 70, fontWeight: 800, lineHeight: 1.1 }}>{(poll?.title ?? 'Election').slice(0, 90)}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
              {(poll?.options ?? []).slice(0, 5).map((o) => (
                <div key={o.id} style={{ display: 'flex', padding: '10px 22px', borderRadius: 999, background: '#f0eee3', fontSize: 30, fontWeight: 700 }}>
                  {o.label.slice(0, 24)}{show ? ` · ${Math.round(o.percent)}%` : ''}
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'center', fontSize: 30, fontWeight: 700 }}>
          {duo ? 'Who would you pick? Tap to vote' : 'Tap to vote'}
        </div>
      </div>
    ),
    size,
  );
}
