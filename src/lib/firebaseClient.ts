'use client';
import type { ConfirmationResult, RecaptchaVerifier } from 'firebase/auth';

// The phone's half of Google / phone-number sign-in (the server's half: src/lib/firebaseAuth.ts). Firebase is loaded
// only when someone taps one of these buttons, so it never slows the site down, and it keeps nothing on the phone
// (in-memory only): our own sign-in cookie is the session. Off until the owner adds the Firebase keys.
const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};
export const firebaseOn = !!(config.apiKey && config.authDomain && config.projectId);
/** Phone codes cost money per SMS (Firebase's paid Blaze plan), so the phone button has its own switch
 * (owner, Oct 2026: "I don't want to pay"): NEXT_PUBLIC_FIREBASE_PHONE=on. Google sign-in is free. */
export const phoneOn = firebaseOn && process.env.NEXT_PUBLIC_FIREBASE_PHONE === 'on';
/** Google's own account sheet (owner, Oct 2026: "it should open the mobile native Google login screen"): Google's
 * sign-in button (Google Identity Services) with FedCM, so Chrome on Android shows the phone's own account picker that
 * slides up, not a new window. Needs the Web client id (NEXT_PUBLIC_GOOGLE_CLIENT_ID); without it, the Google window. */
export const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() ?? '';
export const nativeGoogleOn = firebaseOn && googleClientId.length > 0;

type Loaded = { fa: typeof import('firebase/auth'); auth: import('firebase/auth').Auth };
let loaded: Loaded | null = null;
async function load(lang: string): Promise<Loaded> {
  if (loaded) {
    loaded.auth.languageCode = lang === 'en' ? 'en' : 'hi';
    return loaded;
  }
  const [{ initializeApp, getApps }, fa] = await Promise.all([import('firebase/app'), import('firebase/auth')]);
  const app = getApps()[0] ?? initializeApp(config);
  let auth;
  try {
    auth = fa.initializeAuth(app, { persistence: fa.inMemoryPersistence, popupRedirectResolver: fa.browserPopupRedirectResolver });
  } catch {
    auth = fa.getAuth(app); // already set up on an earlier tap
  }
  auth.languageCode = lang === 'en' ? 'en' : 'hi'; // the SMS and the Google window in the reader's language
  loaded = { fa, auth };
  return loaded;
}
/** Loads Firebase as the sign-in screen opens, so a tap on Google opens its window at once (phones block a window that
 * opens after a wait). */
export const warmFirebase = (lang: string) => void load(lang).catch(() => undefined);

/** Firebase's ticket for this person, then Firebase forgets them (only our cookie signs them in). */
async function ticket(fa: typeof import('firebase/auth'), auth: import('firebase/auth').Auth, user: import('firebase/auth').User) {
  const token = await user.getIdToken();
  await fa.signOut(auth).catch(() => undefined);
  return token;
}

/** Opens Google's window (when the account sheet is not set up); resolves with the ticket. */
export async function googleTicket(lang: string): Promise<string> {
  const { fa, auth } = loaded ?? (await load(lang));
  const cred = await fa.signInWithPopup(auth, new fa.GoogleAuthProvider());
  return ticket(fa, auth, cred.user);
}

/** The account sheet's Google token → Firebase's ticket (the same ticket the server already checks). */
export async function ticketFromGoogle(idToken: string, lang: string): Promise<string> {
  const { fa, auth } = await load(lang);
  const cred = await fa.signInWithCredential(auth, fa.GoogleAuthProvider.credential(idToken));
  return ticket(fa, auth, cred.user);
}

type GoogleId = {
  initialize: (o: Record<string, unknown>) => void;
  renderButton: (el: HTMLElement, o: Record<string, unknown>) => void;
};
let gsi: Promise<GoogleId> | null = null;
/** Google's sign-in script, loaded once, only on the sign-in screen. */
export function loadGoogleButton(): Promise<GoogleId> {
  gsi ??= new Promise<GoogleId>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = () => {
      const id = (window as unknown as { google?: { accounts?: { id?: GoogleId } } }).google?.accounts?.id;
      if (id) resolve(id);
      else reject(new Error('gsi'));
    };
    s.onerror = () => reject(new Error('gsi'));
    document.head.appendChild(s);
  }).catch((e) => {
    gsi = null;
    throw e;
  });
  return gsi;
}

let verifier: RecaptchaVerifier | null = null;
/** Sends the SMS code. `buttonId` is the Send code button (Firebase's invisible robot check sits on it). */
export async function sendPhoneCode(phone: string, buttonId: string, lang: string): Promise<ConfirmationResult> {
  const { fa, auth } = await load(lang);
  verifier?.clear();
  verifier = new fa.RecaptchaVerifier(auth, buttonId, { size: 'invisible' });
  return fa.signInWithPhoneNumber(auth, phone, verifier);
}
export async function confirmPhoneCode(conf: ConfirmationResult, code: string, lang: string): Promise<string> {
  const { fa, auth } = await load(lang);
  const cred = await conf.confirm(code);
  return ticket(fa, auth, cred.user);
}

/** "98765 43210" → "+919876543210" (India by default); an international number keeps its own "+code". */
export function phoneE164(raw: string): string | null {
  const s = raw.replace(/[\s\-().]/g, '');
  const n = s.startsWith('+') ? s : s.startsWith('0') && s.length === 11 ? `+91${s.slice(1)}` : /^\d{10}$/.test(s) ? `+91${s}` : s.startsWith('91') && s.length === 12 ? `+${s}` : '';
  return /^\+[1-9]\d{7,14}$/.test(n) ? n : null;
}

/** Firebase's error code ("auth/…"), or "". */
export const firebaseCode = (err: unknown) => (err && typeof err === 'object' && 'code' in err ? String((err as { code: unknown }).code) : '');
