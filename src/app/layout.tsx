import { SITE_URL } from '@/lib/site';
import type { Metadata, Viewport } from 'next';
import BottomNav from '@/components/BottomNav';
import TopBar from '@/components/TopBar';
import OfflineBar from '@/components/OfflineBar';
import '@fontsource-variable/bricolage-grotesque/standard.css';
import '@fontsource/lato/400.css';
import '@fontsource/lato/700.css';
import '@fontsource/noto-sans-devanagari/400.css';
import '@fontsource/noto-sans-devanagari/700.css';
import { getLang } from '@/lib/lang-server';
import { LangProvider } from '@/lib/lang';
import { dict } from '@/lib/i18n';
import '@/styles/index.css';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'Election · Who would you pick?', template: '%s · Election' },
  description: 'Quick head-to-head duels. Tap your pick, see where everyone stands. Just for fun.',
};

export const viewport: Viewport = {
  // Use the whole screen on phones with a notch or a home bar; the bars add the safe-area space themselves.
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fbfbf7' },
    { media: '(prefers-color-scheme: dark)', color: '#161819' },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang();
  return (
    <html lang={lang === 'hg' ? 'hi-Latn' : lang}>
      <body>
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
