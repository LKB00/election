// The splash (docs/DESIGN.md, "Splash and onboarding"): about one second of brand while the app opens. A ballot slip
// drops into the box, the label lights up in "you" yellow, the name and line rise, and it fades away by itself.
// Pure HTML and CSS (no script), so it never delays the page: the page loads underneath and is ready when it lifts.
// `standalone`: shown on every launch from the home screen (the installed app); otherwise only where it is placed (Home
// on a first visit). Off for people who ask their phone for less motion. Hidden from screen readers.
export default function Splash({ line, standaloneOnly = false }: { line: string; standaloneOnly?: boolean }) {
  return (
    <div className={'splash' + (standaloneOnly ? ' is-standalone' : '')} aria-hidden>
      <svg className="splash-box" width="168" height="146" viewBox="0 0 120 104" focusable="false">
        <ellipse cx="60" cy="98" rx="46" ry="5" fill="var(--line)" />
        <g className="splash-slip">
          <rect x="44" y="0" width="32" height="40" rx="5" fill="var(--spot-paper)" stroke="var(--ink)" strokeWidth="2.5" />
          <circle cx="60" cy="16" r="7" fill="var(--lime)" stroke="var(--ink)" strokeWidth="2" />
          <path d="M57 16l2.2 2.2 4.3-4.3" fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        <rect x="14" y="52" width="92" height="44" rx="11" fill="var(--p-input)" stroke="var(--ink)" strokeWidth="2.5" />
        <rect x="6" y="40" width="108" height="16" rx="8" fill="var(--spot-paper)" stroke="var(--ink)" strokeWidth="2.5" />
        <rect x="40" y="45" width="40" height="6" rx="3" fill="var(--ink)" />
        <rect className="splash-label" x="38" y="67" width="44" height="16" rx="8" fill="var(--card)" stroke="var(--ink)" strokeWidth="2" />
        {/* Sparkles once the slip is in. */}
        <g className="splash-sparks" fill="var(--lime)" stroke="var(--ink)" strokeWidth="1.2" strokeLinejoin="round">
          <path d="M10 18 Q10 24 16 24 Q10 24 10 30 Q10 24 4 24 Q10 24 10 18Z" />
          <path d="M108 10 Q108 15 113 15 Q108 15 108 20 Q108 15 103 15 Q108 15 108 10Z" />
          <path d="M104 30 Q104 33 107 33 Q104 33 104 36 Q104 33 101 33 Q104 33 104 30Z" />
        </g>
      </svg>
      <p className="splash-name"><span className="logo-mark" aria-hidden /> Election</p>
      <p className="splash-line">{line}</p>
    </div>
  );
}
