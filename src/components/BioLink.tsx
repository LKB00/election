'use client';
import { useState } from 'react';
import { Check, Link2 } from 'lucide-react';
import { useT } from '@/lib/lang';

// The maker's own bio link (only they see this box on their page): the address to put in an Instagram, X or YouTube
// bio, and one Copy button. The page behind it always opens on their newest poll.
export default function BioLink({ url }: { url: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };
  return (
    <section className="bio-link" aria-label={t.bioLinkTitle}>
      <p className="label">{t.bioLinkTitle}</p>
      <span className="row bio-link__row">
        <code className="bio-link__url">{url.replace(/^https?:\/\//, '')}</code>
        <button type="button" className="btn btn-primary" onClick={copy}>
          {copied ? <Check size={16} strokeWidth={2} aria-hidden /> : <Link2 size={16} strokeWidth={2} aria-hidden />} {copied ? t.linkCopied : t.copyLink}
        </button>
      </span>
      <p className="small muted">{t.bioLinkNote}</p>
    </section>
  );
}
