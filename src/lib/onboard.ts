// Shared by the splash (an inline script in the page, before React) and the onboarding cards.
/** localStorage key: the onboarding version this phone has seen. */
export const SEEN = 'election-onboarded';
/** Bump to show the cards (and the Home splash) once more to every phone, voters included. */
export const ONBOARD_VERSION = '2';
/** Fired on window when the splash has faded away (the onboarding opens after it). */
export const SPLASH_DONE = 'election:splash-done';
/** The splash plays its slip-drop at least this long, then lifts as soon as the page is ready (ms)… */
export const SPLASH_MIN_MS = 1150;
/** …but never stays longer than this, even on a slow connection (the page's grey outline shows after). */
export const SPLASH_MAX_MS = 3000;
/** Length of the fade-out (ms); matches .splash-done in election.css. */
export const SPLASH_FADE_MS = 350;
