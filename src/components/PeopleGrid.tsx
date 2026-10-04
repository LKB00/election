// "Out of every 100 voters": 100 dots, the ones who picked what you picked in yellow (yellow = you), the rest grey.
// An icon array: people read "62 of 100" more accurately than "62%", most of all people who find numbers hard
// (risk-communication research; reports in research_notes/Visual communication design). The words say it too
// (colour never alone), and your own dot has an ink ring.
export default function PeopleGrid({ pct, caption, label }: { pct: number; caption: string; label: string }) {
  // Your choice gets at least one dot: you are in it.
  const mine = Math.min(100, Math.max(1, Math.round(pct)));
  return (
    <figure className="people-grid">
      <p className="label">{label}</p>
      <div className="people-grid__dots" role="img" aria-label={caption}>
        {Array.from({ length: 100 }, (_, n) => (
          <span key={n} className={'people-grid__dot' + (n < mine ? ' is-mine' : '') + (n === 0 ? ' is-you' : '')} style={{ '--n': n } as React.CSSProperties} />
        ))}
      </div>
      <figcaption>
        <strong className="people-grid__big">{mine}</strong> <span>{caption}</span>
      </figcaption>
    </figure>
  );
}
