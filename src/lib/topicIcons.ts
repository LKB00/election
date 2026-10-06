import { Cpu, Film, Landmark, Medal, MessageCircleQuestion, Music, Trophy, Users, UtensilsCrossed } from 'lucide-react';

// One picture per topic, used wherever a topic is named (rows, topic chips, the topic page): seen before read.
const TOPIC_ICONS: Record<string, typeof Trophy> = { politics: Landmark, cricket: Trophy, sports: Medal, movies: Film, music: Music, food: UtensilsCrossed, tech: Cpu, friends: Users };
export const topicIcon = (category: string) => TOPIC_ICONS[category] ?? MessageCircleQuestion;
/** The soft disc colour for each topic (Arogya's pastel tones), so a topic keeps one colour everywhere. */
const TONES: Record<string, string> = { general: 'var(--p-input)', politics: 'var(--p-trust)', cricket: 'var(--p-control)', sports: 'var(--p-control)', movies: 'var(--p-feedback)', music: 'var(--p-output)', food: 'var(--p-feedback)', tech: 'var(--p-input)', friends: 'var(--p-output)' };
export const topicTone = (category: string) => TONES[category] ?? 'var(--p-input)';
