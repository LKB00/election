import { SITE_URL } from '@/lib/site';
import type { Metadata, Viewport } from 'next';
import BottomNav from '@/components/BottomNav';
import TopBar from '@/components/TopBar';
import OfflineBar from '@/components/OfflineBar';
import '@fontsource-variable/figtree/index.css';
import '@fontsource/noto-sans-devanagari/400.css';
import '@fontsource/noto-sans-devanagari/700.css';
import { getLang } from '@/lib/lang-server';
import { LangProvider } from '@/lib/lang';
import Splash from '@/components/Splash';
import { dict } from '@/lib/i18n';
import { PALETTE } from '@/lib/palette';
import '@/styles/index.css';

export async function generateMetadata(): Promise<Metadata> {
  const t = dict[await getLang()];
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: `${t.siteName} · ${t.splashLine}`, template: `%s · ${t.siteName}` },
    description: t.metaDesc,
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
        </LangProvider>
      </body>
    </html>
  );
}
