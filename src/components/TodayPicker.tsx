'use client';
import { useState } from 'react';
import { useLang, useT } from '@/lib/lang';
import { INDIA_OFFSET, INDIA_TZ, dateLocale, monthStyle } from '@/lib/time';

type P = { id: string; title: string };
type Planned = P & { day: string };

// "Sun 8 Nov": the day a plan is for (India dates, no time zone shifts: it is a calendar day, not a moment).
const dayName = (day: string, lang: string) =>
  new Date(`${day}T12:00:00${INDIA_OFFSET}`).toLocaleDateString(dateLocale(lang), { weekday: 'short', day: 'numeric', month: monthStyle(lang), timeZone: INDIA_TZ });

// The owner's "Today's question" picker on /admin: the current one, what is planned for later days (festivals, match
// days: they take over by themselves that morning), then the newest polls with "Make today's question" and a date box.
export default function TodayPicker({ current, polls, planned: initialPlanned, adminKey, todayLabel }: { current: P | null; polls: P[]; planned: Planned[]; adminKey: string; todayLabel: string }) {
  const t = useT();
  const lang = useLang();
  const [today, setToday] = useState(current);
  const [planned, setPlanned] = useState(initialPlanned);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  // On by default: today's question closes at 9 pm India time with a real final count (the evening comeback).
  const [closeTonight, setCloseTonight] = useState(true);
  async function post(id: string, body: object) {
    setBusy(id);
    setError('');
    const res = await fetch(`/api/admin/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: adminKey, ...body }) }).catch(() => null);
    setBusy(null);
    if (!res?.ok) setError(t.adminPlanFail);
    return !!res?.ok;
  }
  async function pick(p: P) {
    if (await post(p.id, { action: 'today', closeTonight })) {
      setToday(p);
      setPlanned((x) => x.filter((y) => y.day !== todayLabel || y.id === p.id));
    }
  }
  async function plan(p: P, day: string | null) {
    if (await post(p.id, { action: 'plan', day })) {
      setPlanned((x) => [...x.filter((y) => y.id !== p.id), ...(day ? [{ ...p, day }] : [])].sort((a, b) => a.day.localeCompare(b.day)));
    }
  }
  return (
    <section className="block" aria-label={t.todaysQuestion}>
      <h2>{t.todaysQuestion}</h2>
      {today && <p className="small"><strong>{t.adminIsToday}:</strong> {today.title}</p>}
      <p className="small muted">{t.adminTodayLead}</p>
      {/* The one link to post every day: it always opens today's question. */}
      <p className="small">{t.adminTodayLink} <code suppressHydrationWarning>{typeof window !== 'undefined' ? `${window.location.origin}/today` : '/today'}</code></p>
      <label className="small picker-consent">
        <input type="checkbox" checked={closeTonight} onChange={(e) => setCloseTonight(e.target.checked)} />
        <span>{t.adminCloseTonight}</span>
      </label>

      {/* Planned days (P2): festivals, match days, film Fridays. Each takes over by itself that morning, with the 9 pm count. */}
      <h3 className="small label block-tight">{t.adminPlanned}</h3>
      {planned.length === 0 ? (
        <p className="small muted">{t.adminPlannedNone}</p>
      ) : (
        <ul className="index-list">
          {planned.map((p) => (
            <li key={p.id} className="today-pick">
              <span className="index-title"><strong>{dayName(p.day, lang)}</strong> · {p.title}</span>
              <button type="button" className="btn btn-ghost" disabled={!!busy} onClick={() => plan(p, null)}>{t.adminPlanRemove}</button>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="small duel-error" role="alert">{error}</p>}

      <ul className="index-list block-tight">
        {polls.filter((p) => p.id !== today?.id).map((p) => (
          <li key={p.id} className="today-pick">
            <span className="index-title">{p.title}</span>
            <span className="row wrap today-actions">
              <button type="button" className="btn btn-ghost" disabled={!!busy} onClick={() => pick(p)}>{t.adminMakeToday}</button>
              <label className="search today-date">
                <span className="sr-only">{t.adminPlanFor(p.title)}</span>
                <input type="date" min={todayLabel} value={planned.find((x) => x.id === p.id)?.day ?? ''} disabled={!!busy} onChange={(e) => plan(p, e.target.value || null)} />
              </label>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
