import { ImageResponse } from 'next/og';
import { getDb } from '@/db';
import { getPoll } from '@/lib/polls';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Election duel';
export const dynamic = 'force-dynamic';

const SIDES = ['#6e5bff', '#ff4f7b'];

function splitName(label: string) {
  const parts = label.trim().split(/\s+/);
  return parts.length === 1 ? { first: '', last: parts[0] } : { first: parts.slice(0, -1).join(' '), last: parts[parts.length - 1] };
}

// The share card shown when the link is pasted in WhatsApp, X, Slack, etc.
// It never shows the split: friends have to vote to see it.
export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const poll = await getPoll(await getDb(), (await params).id, null);
  const duo = poll && poll.options.length === 2 ? poll.options : null;

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding: 40, background: '#0e0e13', color: '#fff', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 26, fontWeight: 800 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', width: 26, height: 26, borderRadius: 13, background: 'linear-gradient(90deg, #6e5bff 50%, #ff4f7b 50%)' }} />
            election
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 22, color: 'rgba(255,255,255,.7)' }}>
            <div style={{ display: 'flex', width: 12, height: 12, borderRadius: 6, background: '#ff3b4e' }} />
            LIVE DUEL{poll && poll.participants > 0 ? ` · ${poll.participants.toLocaleString()} votes` : ''}
          </div>
        </div>

        {duo ? (
          <div style={{ display: 'flex', flex: 1, gap: 20, marginTop: 28, position: 'relative' }}>
            {duo.map((o, i) => {
              const { first, last } = splitName(o.label);
              return (
                <div key={o.id} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', flex: 1, padding: 36, borderRadius: 32, background: `linear-gradient(180deg, ${SIDES[i]} 0%, ${SIDES[i]}55 60%, #17171f 100%)` }}>
                  {o.subtitle && <div style={{ display: 'flex', fontSize: 20, fontWeight: 700, letterSpacing: 3, color: 'rgba(255,255,255,.7)' }}>{o.subtitle.toUpperCase()}</div>}
                  {first && <div style={{ display: 'flex', fontSize: 34, fontWeight: 700, marginTop: 8 }}>{first.slice(0, 20)}</div>}
                  <div style={{ display: 'flex', fontSize: last.length > 7 ? 92 : 120, fontWeight: 900, lineHeight: 0.95, letterSpacing: -4 }}>{last.toUpperCase().slice(0, 12)}</div>
                </div>
              );
            })}
            <div style={{ position: 'absolute', left: 540, top: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 100, height: 72, borderRadius: 16, background: '#fff', color: '#0e0e13', fontSize: 40, fontWeight: 900, transform: 'rotate(-8deg)', border: '8px solid #0e0e13' }}>VS</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flex: 1, flexDirection: 'column', justifyContent: 'center', gap: 24 }}>
            <div style={{ display: 'flex', fontSize: 84, fontWeight: 900, lineHeight: 1, letterSpacing: -3 }}>{(poll?.title ?? 'Election').slice(0, 80)}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
              {(poll?.options ?? []).slice(0, 5).map((o, i) => (
                <div key={o.id} style={{ display: 'flex', padding: '12px 24px', borderRadius: 999, background: i % 2 ? '#ff4f7b' : '#6e5bff', fontSize: 30, fontWeight: 800 }}>{o.label.slice(0, 24)}</div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24, fontSize: 30, fontWeight: 800 }}>Who would you pick? Tap to vote →</div>
      </div>
    ),
    size,
  );
}
