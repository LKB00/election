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

async function load(lang: string) {
  const [{ initializeApp, getApps }, fa] = await Promise.all([import('firebase/app'), import('firebase/auth')]);
  const app = getApps()[0] ?? initializeApp(config);
  let auth;
  try {
    auth = fa.initializeAuth(app, { persistence: fa.inMemoryPersistence, popupRedirectResolver: fa.browserPopupRedirectResolver });
  } catch {
    auth = fa.getAuth(app); // already set up on an earlier tap
  }
  auth.languageCode = lang === 'en' ? 'en' : 'hi'; // the SMS and the Google window in the reader's language
  return { fa, auth };
}

/** Firebase's ticket for this person, then Firebase forgets them (only our cookie signs them in). */
async function ticket(fa: typeof import('firebase/auth'), auth: import('firebase/auth').Auth, user: import('firebase/auth').User) {
  const token = await user.getIdToken();
  await fa.signOut(auth).catch(() => undefined);
  return token;
}

/** Opens Google's window; resolves with the ticket. */
export async function googleTicket(lang: string): Promise<string> {
  const { fa, auth } = await load(lang);
  const cred = await fa.signInWithPopup(auth, new fa.GoogleAuthProvider());
  return ticket(fa, auth, cred.user);
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
