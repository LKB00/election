import { createHash } from 'node:crypto';

// Limits how fast one person can vote, create or report.
// With UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN set, the counts are shared by every server
// (Vercel runs many at once, so per-server counts barely limit anything). Without them: kept in this server's memory.
// Keys hold a hash of the IP address, never the address itself (privacy law: do not store raw IPs).
const hits = new Map<string, number[]>();

function memoryLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 10_000) for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
  return true;
}

/** Shared counter: one count per time window (fixed window). Fails open: if Redis is down, voting still works. */
async function redisLimit(url: string, token: string, key: string, max: number, windowMs: number): Promise<boolean> {
  const bucket = `rl:${key}:${Math.floor(Date.now() / windowMs)}`;
  try {
    const res = await fetch(`${url.replace(/\/$/, '')}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([
        ['INCR', bucket],
        ['PEXPIRE', bucket, String(windowMs)],
      ]),
      signal: AbortSignal.timeout(800),
    });
    if (!res.ok) return memoryLimit(key, max, windowMs);
    const [incr] = (await res.json()) as { result?: number }[];
    return (incr?.result ?? 0) <= max;
  } catch {
    return memoryLimit(key, max, windowMs);
  }
}

export async function rateLimit(key: string, max: number, windowMs: number): Promise<boolean> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? redisLimit(url, token, key, max, windowMs) : memoryLimit(key, max, windowMs);
}

/** A short hash of the visitor's IP. Mobile networks put many people behind one IP, so limits using it stay loose. */
export function clientIp(req: Request): string {
  // x-real-ip is set by the host (Vercel, most proxies) and cannot be faked by the visitor; x-forwarded-for is the fallback.
  const ip = req.headers.get('x-real-ip')?.trim() || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  return createHash('sha256').update(`${process.env.VOTER_SECRET ?? ''}:${ip}`).digest('base64url').slice(0, 16);
}
