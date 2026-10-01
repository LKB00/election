import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import PollView from '@/components/PollView';
import { getDb } from '@/db';
import { getPoll } from '@/lib/polls';
import { readVoterId } from '@/lib/voter';

export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const poll = await getPoll(await getDb(), (await params).id, null);
  if (!poll) return { title: 'Poll not found' };
  const names = poll.options.map((o) => o.label).join(' vs ');
  return {
    title: poll.title,
    description: names,
    openGraph: { title: poll.title, description: `${names}. Cast your vote!` },
    twitter: { card: 'summary_large_image' },
  };
}

export default async function PollPage({ params }: Props) {
  const { id } = await params;
  const poll = await getPoll(await getDb(), id, await readVoterId());
  if (!poll) notFound();
  return <PollView initial={poll} />;
}
