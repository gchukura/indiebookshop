/**
 * Per-IP rate limiting for form and write endpoints.
 *
 * Backend:
 *   - Upstash Redis (shared across all Lambdas) when UPSTASH_REDIS_REST_URL and
 *     UPSTASH_REDIS_REST_TOKEN are set.
 *   - Otherwise an in-memory sliding window. This is per-Lambda instance and
 *     resets on cold start, so it is best-effort only.
 *
 * Usage in a route handler:
 *   const limited = await checkRateLimit(request, RATE_LIMITS.contact);
 *   if (limited) return limited;
 */

import { NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export type RateLimitConfig = {
  /** Namespace for the key, e.g. 'contact'. Each endpoint gets its own bucket. */
  name: string;
  /** Max requests allowed per window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
};

const TEN_MINUTES = 10 * 60 * 1000;

export const RATE_LIMITS = {
  contact: { name: 'contact', limit: 5, windowMs: TEN_MINUTES },
  submit: { name: 'submit', limit: 5, windowMs: TEN_MINUTES },
  events: { name: 'events', limit: 5, windowMs: TEN_MINUTES },
  newsletter: { name: 'newsletter', limit: 3, windowMs: TEN_MINUTES },
} satisfies Record<string, RateLimitConfig>;

type LimitResult = { success: boolean; retryAfterSeconds: number };

/** Client IP from the first x-forwarded-for entry (set by Vercel), or 'unknown'. */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const first = forwarded?.split(',')[0]?.trim();
  return first || 'unknown';
}

// ---------------------------------------------------------------------------
// Upstash backend
// ---------------------------------------------------------------------------

const upstashEnabled = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);

const upstashLimiters = new Map<string, Ratelimit>();

function getUpstashLimiter(config: RateLimitConfig): Ratelimit {
  let limiter = upstashLimiters.get(config.name);
  if (!limiter) {
    limiter = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(config.limit, `${config.windowMs} ms`),
      prefix: `ratelimit:${config.name}`,
    });
    upstashLimiters.set(config.name, limiter);
  }
  return limiter;
}

async function limitWithUpstash(config: RateLimitConfig, ip: string): Promise<LimitResult> {
  const { success, reset } = await getUpstashLimiter(config).limit(ip);
  return { success, retryAfterSeconds: Math.max(1, Math.ceil((reset - Date.now()) / 1000)) };
}

// ---------------------------------------------------------------------------
// In-memory backend (per-Lambda, best-effort)
// ---------------------------------------------------------------------------

const memoryHits = new Map<string, number[]>();
const MAX_TRACKED_KEYS = 10_000;

function limitInMemory(config: RateLimitConfig, ip: string): LimitResult {
  const now = Date.now();
  const key = `${config.name}:${ip}`;
  const windowStart = now - config.windowMs;
  const hits = (memoryHits.get(key) ?? []).filter(t => t > windowStart);

  if (hits.length >= config.limit) {
    memoryHits.set(key, hits);
    return {
      success: false,
      retryAfterSeconds: Math.max(1, Math.ceil((hits[0] + config.windowMs - now) / 1000)),
    };
  }

  hits.push(now);
  memoryHits.set(key, hits);

  // Keep memory bounded: drop keys whose newest hit is outside every window
  if (memoryHits.size > MAX_TRACKED_KEYS) {
    const oldestWindowStart = now - TEN_MINUTES;
    for (const [k, times] of memoryHits) {
      if (times[times.length - 1] <= oldestWindowStart) memoryHits.delete(k);
    }
  }

  return { success: true, retryAfterSeconds: 0 };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns a 429 response if the client is over the limit for this endpoint,
 * otherwise null. Falls back to the in-memory limiter if Upstash errors.
 */
export async function checkRateLimit(
  request: Request,
  config: RateLimitConfig
): Promise<NextResponse | null> {
  const ip = getClientIp(request);

  let result: LimitResult;
  if (upstashEnabled) {
    try {
      result = await limitWithUpstash(config, ip);
    } catch (err) {
      console.error('[RateLimit] Upstash error, falling back to in-memory:', err);
      result = limitInMemory(config, ip);
    }
  } else {
    result = limitInMemory(config, ip);
  }

  if (result.success) return null;

  return NextResponse.json(
    { error: 'Too many requests' },
    { status: 429, headers: { 'Retry-After': String(result.retryAfterSeconds) } }
  );
}
