// A small, quick burst of pastel confetti for wins (same as patricka).
const COLORS = ['var(--d-input)', 'var(--d-output)', 'var(--d-control)', 'var(--d-trust)', 'var(--d-feedback)', 'var(--d-agents)', 'var(--lime)'];

export default function Burst({ count = 18 }: { count?: number }) {
  return (
    <span className="burst" aria-hidden>
      {Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2 + (i % 3) * 0.2;
        const dist = 60 + (i % 4) * 22;
        return (
          <span
            key={i}
            style={
              {
                '--x': `${Math.cos(angle) * dist}px`,
                '--y': `${Math.sin(angle) * dist - 20}px`,
                '--r': `${(i * 47) % 360}deg`,
                background: COLORS[i % COLORS.length],
                animationDelay: `${(i % 5) * 18}ms`,
              } as React.CSSProperties
            }
          />
        );
      })}
    </span>
  );
}
