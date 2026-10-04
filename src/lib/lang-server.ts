import { cookies, headers } from 'next/headers';
import { dict, isLang, type Lang } from './i18n';

/** The visitor's language: their choice (cookie), else Hindi if their phone is set to Hindi, else English. */
export async function getLang(): Promise<Lang> {
  const c = (await cookies()).get('lang')?.value;
  if (isLang(c)) return c;
  const h = await headers();
  // The language version of the address (?l=hi), for visitors who have not chosen one (and for search engines).
  const fromUrl = h.get('x-url-lang');
  if (isLang(fromUrl)) return fromUrl;
  const accept = h.get('accept-language') ?? '';
  return /^hi\b/i.test(accept.trim()) ? 'hi' : 'en';
}

export async function getT() {
  return dict[await getLang()];
}

/** Search engines: each page has an English, Hindi (?l=hi) and Hinglish (?l=hg) address, each pointing at the others
 * (hreflang). The canonical address is the language version being looked at. */
export async function langAlternates(path: string) {
  const l = (await headers()).get('x-url-lang');
  const at = (x: string) => (x === 'en' ? path : `${path}${path.includes('?') ? '&' : '?'}l=${x}`);
  return {
    canonical: at(l === 'hi' || l === 'hg' ? l : 'en'),
    languages: { en: at('en'), hi: at('hi'), 'hi-Latn': at('hg'), 'x-default': path },
  };
}
