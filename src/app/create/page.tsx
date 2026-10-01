import type { Metadata } from 'next';
import CreateForm from '@/components/CreateForm';

export const metadata: Metadata = { title: 'Start a duel' };

export default function CreatePage() {
  return (
    <div className="page">
      <header className="page-head">
        <p className="eyebrow">Takes 30 seconds</p>
        <h1 className="display">Start a duel</h1>
        <p className="lead">Two or more choices. Share the link. See who wins.</p>
      </header>
      <section className="block block-tight">
        <CreateForm />
      </section>
    </div>
  );
}
