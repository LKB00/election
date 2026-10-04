'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useLang, useT } from '@/lib/lang';
import { apiMsg } from '@/lib/i18n';
import { emojiFor } from '@/lib/createHelp';
import { RATING_EMOJIS, RATING_LABELS } from '@/lib/rating';
import { rememberMyPoll } from './MyPolls';
import SignInSheet from './SignIn';

// Match-day and show-night packs (docs/DESIGN.md, "Packs"): type the names and the start time; the pack's polls are
// written for you, shown before you make them. Predictions ("Called it") close when it starts.
const HOUR = 3_600_000;
export default function PackForm({ initialKind = 'match', signedIn = false }: { initialKind?: 'match' | 'show'; signedIn?: boolean }) {
  const t = useT();
  const lang = useLang();
  const [signed, setSigned] = useState(signedIn);
  const [ask, setAsk] = useState(false);
  const router = useRouter();
  const [kind, setKind] = useState<'match' | 'show'>(initialKind);
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [show, setShow] = useState('');
  const [people, setPeople] = useState('');
  const [starts, setStarts] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const names = people.split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 10);
  const at = starts ? new Date(starts) : null;
  const iso = (d: Date) => d.toISOString();
  const choice = (title: string, options: string[], extra: Record<string, unknown> = {}) => ({
    title, options, emojis: options.map((o) => emojiFor(o) || ''), kind: 'choice', hideUntilVoted: true, ...extra,
  });

  // The polls this pack makes, in the creator's language (people's own names are never translated).
  const items = () => {
    if (!at) return [];
    const close = iso(at);
    if (kind === 'match') {
      return [
        choice(t.packWinQ(a.trim(), b.trim()), [a.trim(), b.trim()], { calledIt: true, category: 'cricket', endsAt: close }),
        choice(t.packEndQ, t.packEndChoices, { calledIt: true, category: 'cricket', endsAt: close }),
        choice(t.packWatchQ, t.packWatchChoices, { category: 'cricket', hideUntilVoted: false, endsAt: iso(new Date(at.getTime() + 5 * HOUR)) }),
      ];
    }
    const s = show.trim();
    return [
      choice(t.packOutQ(s), names, { calledIt: true, category: 'movies', description: t.packFanNote, endsAt: close }),
      choice(t.packFavQ(s), names, { category: 'movies', description: t.packFanNote, endsAt: iso(new Date(at.getTime() + 24 * HOUR)) }),
      { title: t.packRateQ(s), options: RATING_LABELS, emojis: RATING_EMOJIS, kind: 'rating', category: 'movies', hideUntilVoted: true, endsAt: iso(new Date(at.getTime() + 24 * HOUR)) },
    ];
  };

  function problem(): string {
    if (kind === 'match' && (!a.trim() || !b.trim())) return t.packErrNames;
    if (kind === 'show' && show.trim().length < 3) return t.errTitle;
    if (kind === 'show' && names.length < 2) return t.packErrPeople;
    if (!at || at.getTime() <= Date.now()) return t.packErrTime;
    return '';
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const p = problem();
    if (p) return setError(p);
    if (!signed) return setAsk(true);
    send();
  }
  async function send() {
    setBusy(true);
    setError('');
    const res = await fetch('/api/packs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, title: kind === 'match' ? `${a.trim()} vs ${b.trim()}` : show.trim(), startsAt: iso(at!), polls: items() }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (res?.ok && data?.id) {
      // The same private key marks each "Called it" result in the pack, from this phone.
      for (const id of data.pollIds as string[]) rememberMyPoll(id, data.manageKey);
      return router.push(`/pack/${data.id}?new=1`);
    }
    setBusy(false);
    // Signed out on another tab, or the sign-in ran out: ask again.
    if (res?.status === 401) {
      setSigned(false);
      return setAsk(true);
    }
    setError(data?.error ? apiMsg(lang, data.error) : t.errGeneric);
  }

  const minLocal = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
  const preview = items();
  return (
    <form className="pack-form" onSubmit={submit}>
      <div className="builder-kind" role="radiogroup" aria-label={t.packTitle}>
        <button type="button" role="radio" aria-checked={kind === 'match'} className={'chip' + (kind === 'match' ? ' chip-on' : '')} onClick={() => setKind('match')}>🏏 {t.packMatch}</button>
        <button type="button" role="radio" aria-checked={kind === 'show'} className={'chip' + (kind === 'show' ? ' chip-on' : '')} onClick={() => setKind('show')}>📺 {t.packShow}</button>
      </div>
      {kind === 'match' ? (
        <div className="pack-teams">
          <label className="field"><span className="label">{t.packTeamA}</span><input className="input" value={a} maxLength={40} placeholder={t.packTeamAPh} onChange={(e) => setA(e.target.value)} /></label>
          <span className="pack-vs" aria-hidden>vs</span>
          <label className="field"><span className="label">{t.packTeamB}</span><input className="input" value={b} maxLength={40} placeholder={t.packTeamBPh} onChange={(e) => setB(e.target.value)} /></label>
        </div>
      ) : (
        <>
          <label className="field"><span className="label">{t.packShowName}</span><input className="input" value={show} maxLength={40} placeholder={t.packShowPh} onChange={(e) => setShow(e.target.value)} /></label>
          <label className="field"><span className="label">{t.packPeople}</span><textarea className="input" rows={4} value={people} placeholder={t.packPeoplePh} onChange={(e) => setPeople(e.target.value)} /></label>
          <p className="small muted">{t.packFanNote}</p>
        </>
      )}
      <label className="field"><span className="label">{kind === 'match' ? t.packStarts : t.packResultAt}</span><input className="input" type="datetime-local" min={minLocal} value={starts} onChange={(e) => setStarts(e.target.value)} /></label>
      {/* What you get, before you make it (what you see is what voters get). */}
      {preview.length > 0 && !problem() && (
        <div className="pack-preview">
          <p className="label">{t.packWillMake}</p>
          <ol>{preview.map((p, n) => <li key={n}>{(p as { calledIt?: boolean }).calledIt ? '🔮 ' : ''}{p.title}</li>)}</ol>
        </div>
      )}
      {error && <p className="field-error" role="alert">{error}</p>}
      {ask && (
        <SignInSheet
          onClose={() => setAsk(false)}
          onDone={() => {
            setAsk(false);
            setSigned(true);
            send();
          }}
        />
      )}
      {!signed && <p className="small muted">{t.createSignHint}</p>}
      <button className="btn btn-primary btn-lg" disabled={busy}>{busy ? t.packMaking : t.packMake}</button>
    </form>
  );
}
