import type { Metadata, Viewport } from 'next';
import BottomNav from '@/components/BottomNav';
import TopBar from '@/components/TopBar';
import '@fontsource-variable/bricolage-grotesque/standard.css';
import '@fontsource/lato/400.css';
import '@fontsource/lato/700.css';
import '@/styles/index.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: { default: 'Election · Who would you pick?', template: '%s · Election' },
  description: 'Quick head-to-head duels. Tap your pick, see where everyone stands. Just for fun.',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fbfbf7' },
    { media: '(prefers-color-scheme: dark)', color: '#161819' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <a href="#main" className="skip-link">Skip to content</a>
          <TopBar />
          <main id="main" className="main">
            <div className="route">{children}</div>
          </main>
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
