/**
 * Rate limiter abstraction. Calling code depends only on this interface so an
 * in-memory sliding window can be swapped for Redis later without route changes.
 *
 * Production note: InMemorySlidingWindowRateLimiter is process-local. Vercel
 * serverless isolates do not share memory, and cold starts reset the Map, so
 * this limiter is correct for a single long-lived Node process (local `next
 * dev` / `next start`) but is not a reliable hourly cap in production until a
 * shared store (Upstash Redis / Vercel KV) implements RateLimiter.
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
  retryAfterSeconds: number;
}

export interface RateLimiter {
  consume(key: string, limit: number, windowMs: number): RateLimitResult;
}

const HOUR_MS = 60 * 60 * 1000;

export const RATE_LIMIT_WINDOW_MS = HOUR_MS;

/**
 * Sliding-window counter: stores request timestamps per key and counts how many
 * fall within the last `windowMs`. Suitable for a single Node process.
 */
export class InMemorySlidingWindowRateLimiter implements RateLimiter {
  private readonly hits = new Map<string, number[]>();

  consume(key: string, limit: number, windowMs: number): RateLimitResult {
    const now = Date.now();
    const cutoff = now - windowMs;
    const timestamps = (this.hits.get(key) ?? []).filter((t) => t > cutoff);

    if (timestamps.length === 0) {
      this.hits.delete(key);
    }

    if (timestamps.length >= limit) {
      const oldest = timestamps[0] ?? now;
      const retryAfterMs = Math.max(0, oldest + windowMs - now);
      this.hits.set(key, timestamps);
      return {
        allowed: false,
        remaining: 0,
        retryAfterMs,
        retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
      };
    }

    timestamps.push(now);
    this.hits.set(key, timestamps);

    return {
      allowed: true,
      remaining: Math.max(0, limit - timestamps.length),
      retryAfterMs: 0,
      retryAfterSeconds: 0,
    };
  }
}

let activeLimiter: RateLimiter = new InMemorySlidingWindowRateLimiter();

export function getRateLimiter(): RateLimiter {
  return activeLimiter;
}

/** Replace the process-wide limiter (e.g. Redis implementation) without changing callers. */
export function setRateLimiter(limiter: RateLimiter): void {
  activeLimiter = limiter;
}

function firstForwardedHop(value: string | null): string | undefined {
  const first = value?.split(",")[0]?.trim();
  return first || undefined;
}

/**
 * Client IP for per-visitor rate keys.
 *
 * Header order matters on Vercel: `x-forwarded-for` is the public client IP
 * and is overwritten by the platform on a direct Vercel request, but an
 * upstream reverse proxy can replace it with a single shared egress IP.
 * `x-vercel-forwarded-for` and `x-real-ip` are the platform copies of that
 * value and stay available when `x-forwarded-for` has been overwritten.
 *
 * Local `next dev` often has none of these; callers then share the "unknown"
 * bucket, which is expected for a single developer machine.
 */
export function getClientIp(headers: Headers): string {
  const vercelForwarded = firstForwardedHop(headers.get("x-vercel-forwarded-for"));
  if (vercelForwarded) return vercelForwarded;

  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  const cfIp = headers.get("cf-connecting-ip")?.trim();
  if (cfIp) return cfIp;

  const forwarded = firstForwardedHop(headers.get("x-forwarded-for"));
  if (forwarded) return forwarded;

  return "unknown";
}
