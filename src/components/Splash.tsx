import LogoMark from './LogoMark';
import { ONB_READY, ONBOARD_VERSION, SEEN, SPLASH_DONE, SPLASH_FADE_MS, SPLASH_MAX_MS, SPLASH_MIN_MS } from '@/lib/onboard';

// The splash (docs/DESIGN.md, "Splash and onboarding"): about two seconds of brand while the app opens. A ballot slip
// drops into the box, the label lights up in "you" yellow, the name and line rise, and it fades into the page.
// One splash, placed first in <body> by the layout, so it is the first thing painted: the page's grey loading outline
// never shows before it. Its tiny script (run before anything paints) turns it on for the installed app (every launch)
// and for Home on a phone that has not seen this version of the onboarding; never on a shared poll link. It lifts once
// the page is ready (at least SPLASH_MIN_MS, at most SPLASH_MAX_MS), so it fades into the real page, not into a
// half-loaded one. On a first visit "ready" means the onboarding cards are on screen under it, so it fades straight
// into them (Home never flashes in between). Off for people who ask their phone for less motion. Hidden from screen readers.
const script = `(function(){try{
var d=document.documentElement,m=function(q){return window.matchMedia&&matchMedia(q).matches};
var app=m('(display-mode: standalone)'),first=location.pathname==='/'&&localStorage.getItem('${SEEN}')!=='${ONBOARD_VERSION}';
if(!(app||first)||m('(prefers-reduced-motion: reduce)'))return;
d.classList.add('splash-on');var t0=Date.now();
var lift=function(){d.classList.add('splash-done');setTimeout(function(){d.classList.remove('splash-on','splash-done');window.dispatchEvent(new Event('${SPLASH_DONE}'))},${SPLASH_FADE_MS})};
var ready=function(){return first?d.dataset.onb==='${ONB_READY}':document.readyState!=='loading'};
var check=function(){var e=Date.now()-t0;if(e>=${SPLASH_MAX_MS}||ready())lift();else setTimeout(check,100)};
setTimeout(check,${SPLASH_MIN_MS});
}catch(e){}})()`;

export default function Splash({ name, line }: { name: string; line: string }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: script }} />
      <div className="splash" aria-hidden>
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
        <p className="splash-name"><LogoMark size={34} /> {name}</p>
        <p className="splash-line">{line}</p>
      </div>
    </>
  );
}
