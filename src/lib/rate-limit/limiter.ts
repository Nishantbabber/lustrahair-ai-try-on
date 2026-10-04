/**
 * Rate limiter abstraction. Calling code depends only on this interface so an
 * in-memory sliding window can be swapped for Redis later without route changes.
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

export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp =
    headers.get("x-real-ip")?.trim() ||
    headers.get("cf-connecting-ip")?.trim() ||
    headers.get("x-vercel-forwarded-for")?.trim();

  return realIp || "unknown";
}
