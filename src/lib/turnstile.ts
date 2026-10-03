// Cloudflare Turnstile: an invisible "are you a person?" check on each vote. Free, no cookies, no puzzles for most people.
// Off until both keys are set: NEXT_PUBLIC_TURNSTILE_SITE_KEY (the page) and TURNSTILE_SECRET_KEY (the server).
export const turnstileOn = () => !!process.env.TURNSTILE_SECRET_KEY && !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

/** True when the check passed (or is switched off). Fails open if Cloudflare cannot be reached, so voting never breaks. */
export async function verifyHuman(token: string | null | undefined, req: Request): Promise<boolean> {
  if (!turnstileOn()) return true;
  if (!token) return false;
  try {
    const body = new URLSearchParams({ secret: process.env.TURNSTILE_SECRET_KEY!, response: token });
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    if (ip) body.set('remoteip', ip);
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body, signal: AbortSignal.timeout(3000) });
    if (!res.ok) return true;
    return !!((await res.json()) as { success?: boolean }).success;
  } catch {
    return true;
  }
}
