// Shared by the splash (an inline script in the page, before React) and the onboarding cards.
/** localStorage key: the onboarding version this phone has seen. */
export const SEEN = 'election-onboarded';
/** Bump to show the cards (and the Home splash) once more to every phone, voters included. */
export const ONBOARD_VERSION = '2';
/** Fired on window when the splash has faded away. */
export const SPLASH_DONE = 'election:splash-done';
/** On a first visit the onboarding cards set this on <html> (data-onb="ready") once they are on screen, under the
 * splash; the splash waits for it, so it fades straight into the cards and Home never flashes in between. */
export const ONB_READY = 'ready';
/** The splash plays its slip-drop and holds the name at least this long (owner, Oct 2026: "the loader should take some
 * time, not be quick"), then lifts as soon as the page is ready (ms)… */
export const SPLASH_MIN_MS = 2400;
/** …but never stays longer than this, even on a slow connection (the page's grey outline shows after). */
export const SPLASH_MAX_MS = 5000;
/** Length of the fade-out (ms); matches .splash-done in election.css. */
export const SPLASH_FADE_MS = 450;
