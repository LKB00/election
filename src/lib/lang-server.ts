import { cookies, headers } from 'next/headers';
import { dict, isLang, type Lang } from './i18n';

/** The visitor's language: their choice (cookie), else Hindi if their phone is set to Hindi, else English. */
export async function getLang(): Promise<Lang> {
  const c = (await cookies()).get('lang')?.value;
  if (isLang(c)) return c;
  const accept = (await headers()).get('accept-language') ?? '';
  return /^hi\b/i.test(accept.trim()) ? 'hi' : 'en';
}

export async function getT() {
  return dict[await getLang()];
}
