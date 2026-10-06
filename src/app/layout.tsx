import { SITE_URL } from '@/lib/site';
import type { Metadata, Viewport } from 'next';
import BottomNav from '@/components/BottomNav';
import TopBar from '@/components/TopBar';
import OfflineBar from '@/components/OfflineBar';
import '@fontsource-variable/figtree/index.css';
import '@fontsource/noto-sans-devanagari/400.css';
import '@fontsource/noto-sans-devanagari/700.css';
import { getLang } from '@/lib/lang-server';
import { ogBase, siteImage } from '@/lib/og';
import { LangProvider } from '@/lib/lang';
import Splash from '@/components/Splash';
import FirstVisit from '@/components/FirstVisit';
import PageView from '@/components/PageView';
// Visitor numbers for the owner (Vercel Web Analytics: no cookies, no personal data; switched on in Vercel → Analytics).
import { Analytics } from '@vercel/analytics/next';
import { dict } from '@/lib/i18n';
import { PALETTE } from '@/lib/palette';
import '@/styles/index.css';

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  const t = dict[lang];
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: `${t.siteName} · ${t.splashLine}`, template: `%s · ${t.siteName}` },
    description: t.metaDesc,
    // Every link pasted in a chat shows a picture and a line of text, never a bare link (src/lib/og.ts).
    openGraph: { ...ogBase(lang), title: `${t.siteName} · ${t.splashLine}`, description: t.metaDesc, images: [siteImage(lang)] },
    twitter: { card: 'summary_large_image', images: [siteImage(lang).url] },
    // Lets Google Discover and search show the big share picture.
    robots: { 'max-image-preview': 'large' },
  };
}

export const viewport: Viewport = {
  // Use the whole screen on phones with a notch or a home bar; the bars add the safe-area space themselves.
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: PALETTE.paper },
    { media: '(prefers-color-scheme: dark)', color: PALETTE.paperDark },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang();
  return (
    <html lang={lang === 'hg' ? 'hi-Latn' : lang} suppressHydrationWarning>
      <body>
        {/* The one splash: every launch of the installed app, and Home on a first visit (Splash.tsx decides, before paint). */}
        <Splash name={dict[lang].siteName} line={dict[lang].splashLine} />
        <LangProvider lang={lang}>
        <div className="shell">
          <a href="#main" className="skip-link">{dict[lang].skip}</a>
          <OfflineBar />
          <TopBar />
          <main id="main" className="main">
            <div className="route">{children}</div>
          </main>
          <BottomNav />
        </div>
        <Analytics />
        {/* The owner's counts: each phone once (new visitors), and every page opened ("N views" on Home). */}
        <FirstVisit />
        <PageView />
        </LangProvider>
      </body>
    </html>
  );
}
