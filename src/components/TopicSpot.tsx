import { topicIcon, topicTone } from '@/lib/topicIcons';

// The empty state of a topic page: that topic's own picture in its colour, in front of two empty poll cards
// (so Cricket, Movies and Food each look like themselves, not like every other empty page).
export default function TopicSpot({ category }: { category: string }) {
  const Icon = topicIcon(category);
  return (
    <span className="topic-spot" aria-hidden>
      <span className="topic-spot__card" />
      <span className="topic-spot__card" />
      <span className="topic-spot__tile" style={{ '--tone': topicTone(category) } as React.CSSProperties}><Icon size={44} strokeWidth={1.75} /></span>
    </span>
  );
}
