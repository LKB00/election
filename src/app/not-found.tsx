import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="page">
      <header className="page-head">
        <h1 className="display">Duel not found</h1>
        <p className="lead">The link may be wrong, or the duel was removed.</p>
      </header>
      <Link href="/" className="btn btn-primary btn-lg block-tight">Go to today’s duel</Link>
    </div>
  );
}
