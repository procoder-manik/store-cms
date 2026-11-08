import "server-only";
import { headers } from "next/headers";

/** Best-effort client IP and user agent (Vercel / Cloudflare / proxies). */
export async function requestMeta() {
  const h = await headers();
  const ip =
    h.get("cf-connecting-ip") ??
    h.get("x-real-ip") ??
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    null;
  return { ip, userAgent: h.get("user-agent") ?? null };
}
