/**
 * Lightweight in-process rate limiter (fixed window).
 * Sufficient for a single Node instance. For multi-instance deployments,
 * back this with Redis/Upstash — the interface stays identical.
 */
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
  limit: number;
};

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return {
      allowed: true,
      remaining: limit - 1,
      retryAfterSeconds: Math.ceil(windowMs / 1000),
      limit,
    };
  }

  existing.count += 1;
  const allowed = existing.count <= limit;

  // Opportunistic cleanup to keep the map bounded.
  if (buckets.size > 5000) {
    for (const [bucketKey, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(bucketKey);
    }
  }

  return {
    allowed,
    remaining: Math.max(0, limit - existing.count),
    retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    limit,
  };
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "local";
}

/** Derived key: action + caller identity + IP. */
export function rateLimitKey(request: Request, action: string, identity = "anon") {
  return `${action}:${identity}:${clientIp(request)}`;
}
