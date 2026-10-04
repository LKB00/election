import { topicIcon, topicTone } from '@/lib/topicIcons';
import Spot from './Spot';

// A topic page's empty picture: the ballot box in the topic's colour, with the topic's own icon (trophy, film reel,
// plate…) in the white badge on its front, so Cricket, Movies and Food each look like themselves.
export default function TopicSpot({ category }: { category: string }) {
  const Icon = topicIcon(category);
  return (
    <span className="topic-spot" aria-hidden>
      <Spot kind="topic" tone={topicTone(category)} />
      <Icon className="topic-spot__icon" size={22} strokeWidth={2} />
    </span>
  );
}
