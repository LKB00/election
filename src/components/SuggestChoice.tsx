'use client';
import { MessageSquarePlus } from 'lucide-react';
import { useState } from 'react';
import { apiMsg } from '@/lib/i18n';
import { useLang, useT } from '@/lib/lang';
import { MAX_CHOICE } from '@/lib/limits';

// "Missing a choice? Suggest one" (after voting, when the maker allows it). It goes to the maker, who adds it or not;
// nobody else sees it until then, so no open text is ever shown on a poll.
export default function SuggestChoice({ pollId }: { pollId: string }) {
  const t = useT();
  const lang = useLang();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim()) return;
    setBusy(true);
    const res = await fetch(`/api/polls/${pollId}/suggest`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ label }) }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setBusy(false);
    if (!res?.ok) return setMsg(data?.error ? apiMsg(lang, data.error) : t.errGeneric);
    setMsg(data?.exists ? t.suggestExists : t.suggestThanks);
    if (!data?.exists) {
      setLabel('');
      setOpen(false);
    }
  }
  return (
    <div className="suggest">
      {open ? (
        <form className="suggest-form" onSubmit={send}>
          <span className="search">
            <input value={label} maxLength={MAX_CHOICE} placeholder={t.suggestPh} aria-label={t.suggestPh} onChange={(e) => setLabel(e.target.value)} autoFocus enterKeyHint="send" />
          </span>
          <button className="btn btn-ghost btn-sm" disabled={busy || !label.trim()}>{t.suggestSend}</button>
        </form>
      ) : (
        <button type="button" className="link-like small" onClick={() => { setOpen(true); setMsg(''); }}>
          <MessageSquarePlus size={14} strokeWidth={2} aria-hidden /> {t.suggestOpen}
        </button>
      )}
      {msg && <p className="small muted" role="status">{msg}</p>}
    </div>
  );
}
