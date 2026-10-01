import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import BottomNav from '@/components/BottomNav';
import '@/styles/globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: { default: 'Election · Who wins? You decide.', template: '%s · Election' },
  description: 'Make a quick poll between people, things or ideas. Share the link. See who wins.',
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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Lato:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <header className="topnav">
          <div className="topnav-inner">
            <Link href="/" className="logo"><span className="logo-mark" />Election</Link>
            <div className="topnav-right"><Link href="/create" className="btn btn-primary btn-sm">Create a poll</Link></div>
          </div>
        </header>
        <main className="page">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
