'use client';
import { createContext, useContext } from 'react';
import { dict, type Lang } from './i18n';

const LangContext = createContext<Lang>('en');

export function LangProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);
export const useT = () => dict[useContext(LangContext)];

/** Switch language: remembered for a year on this phone, then the page reloads its text. */
export function setLangCookie(lang: Lang) {
  document.cookie = `lang=${lang}; path=/; max-age=31536000; samesite=lax`;
}
