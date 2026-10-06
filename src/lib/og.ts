import { dict, type Lang } from './i18n';

// What a chat app (WhatsApp, Telegram, X, Instagram DMs) shows when someone pastes a Chunav link: a picture, a title,
// a line of text and the site name. Every page has all four, never a bare link (owner, Oct 2026). Next.js replaces a
// parent's openGraph with a page's own, so pages that set one start from these.

/** The site name, kind and language every preview carries. */
export const ogBase = (lang: Lang) => ({ siteName: dict[lang].siteName, type: 'website' as const, locale: lang === 'en' ? 'en_IN' : 'hi_IN' });

/** The brand picture (src/app/api/og/site): for the bare site link and every page without a picture of its own.
 * English or Hinglish (the image renderer cannot shape Hindi). */
export const siteImage = (lang: Lang) => ({ url: `/api/og/site${lang === 'hg' ? '?l=hg' : ''}`, width: 1200, height: 630, alt: dict[lang].ogImageAlt });
