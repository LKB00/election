import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import BottomNav from '@/components/BottomNav';
import '@fontsource-variable/bricolage-grotesque/standard.css';
import '@fontsource-variable/inter/wght.css';
import '@/styles/globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: { default: 'Election · Who wins? You decide.', template: '%s · Election' },
  description: 'Make a quick poll between people, things or ideas. Share the link. See who wins.',
};

export const viewport: Viewport = {
  themeColor: [
    { color: '#f4f2ed' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="topnav">
          <div className="topnav-inner">
            <Link href="/" className="logo"><span className="logo-mark" />election</Link>
            <div className="topnav-right"><Link href="/create" className="btn btn-ghost btn-sm">+ New duel</Link></div>
          </div>
        </header>
        <main className="page">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
