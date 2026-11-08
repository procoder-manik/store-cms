import "server-only";

/**
 * Fixed-window rate limiter. Uses Upstash Redis REST (free tier) when configured,
 * otherwise an in-memory map (fine for local dev, per-instance in production).
 */
const memory = new Map<string, { count: number; reset: number }>();

export async function rateLimit(key: string, limit: number, windowSec: number) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  const bucket = `rl:${key}:${Math.floor(Date.now() / 1000 / windowSec)}`;

  if (url && token) {
    try {
      const res = await fetch(`${url}/pipeline`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify([["INCR", bucket], ["EXPIRE", bucket, String(windowSec)]]),
        cache: "no-store",
      });
      const data = (await res.json()) as { result: number }[];
      const count = Number(data[0]?.result ?? 0);
      return { ok: count <= limit, remaining: Math.max(0, limit - count) };
    } catch {
      // Fail open on Redis outage rather than locking every customer out.
      return { ok: true, remaining: limit };
    }
  }

  const now = Date.now();
  const entry = memory.get(bucket);
  if (!entry || entry.reset < now) {
    memory.set(bucket, { count: 1, reset: now + windowSec * 1000 });
    return { ok: true, remaining: limit - 1 };
  }
  entry.count += 1;
  return { ok: entry.count <= limit, remaining: Math.max(0, limit - entry.count) };
}
