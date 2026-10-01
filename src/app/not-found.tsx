import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="stack" style={{ alignItems: 'flex-start' }}>
      <h1>Poll not found</h1>
      <p className="lead">The link may be wrong, or the poll was removed.</p>
      <Link href="/" className="btn btn-primary">Go home</Link>
    </div>
  );
}
