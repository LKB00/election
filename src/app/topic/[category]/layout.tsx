import { notFound } from 'next/navigation';
import { CATEGORIES } from '@/lib/categories';

// A real "not found" (status 404) for a topic that does not exist: checked here, before the loading picture goes out.
export default async function Layout({ children, params }: { children: React.ReactNode; params: Promise<{ category: string }> }) {
  if (!(CATEGORIES as readonly string[]).includes((await params).category)) notFound();
  return children;
}
