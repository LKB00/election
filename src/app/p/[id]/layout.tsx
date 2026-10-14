import { notFound } from 'next/navigation';
import { exists } from '@/lib/exists';

// A real "not found" (status 404) for a link to nothing: checked here, before the loading picture goes out.
export default async function Layout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  if (!(await exists('poll', (await params).id))) notFound();
  return children;
}
