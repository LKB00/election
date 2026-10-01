import type { Metadata } from 'next';
import CreateForm from '@/components/CreateForm';

export const metadata: Metadata = { title: 'Create a poll' };

export default function CreatePage() {
  return (
    <>
      <h1>Create a poll</h1>
      <p className="lead" style={{ marginBottom: 24 }}>It takes 30 seconds.</p>
      <CreateForm />
    </>
  );
}
