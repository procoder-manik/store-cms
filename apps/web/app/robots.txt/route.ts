import { createClient } from "@supabase/supabase-js";

export const revalidate = 3600;

/** robots.txt: generated from SEO settings, or fully custom when you paste your own in Admin > SEO > Robots.txt. */
export async function GET() {
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  let cfg: { robots_extra?: string; noindex_site?: boolean; robots_txt?: string } = {};
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
    cfg = ((await db.from("settings").select("value").eq("key", "seo").maybeSingle()).data?.value ?? {}) as typeof cfg;
  }
  let body: string;
  if (cfg.robots_txt?.trim()) {
    body = cfg.robots_txt.trim();
    if (!/^sitemap:/im.test(body)) body += `\n\nSitemap: ${site}/sitemap.xml`;
  } else if (cfg.noindex_site) {
    body = "User-agent: *\nDisallow: /";
  } else {
    const disallow = ["/admin", "/api/", "/cart", "/checkout", "/account", "/order/", "/invoice/", "/search", "/*?*sort=", "/bn/cart", "/bn/checkout", "/bn/account",
      ...String(cfg.robots_extra ?? "").split("\n").map((l) => l.trim()).filter((l) => l.startsWith("/"))];
    body = `User-agent: *\nAllow: /\n${disallow.map((d) => `Disallow: ${d}`).join("\n")}\n\nSitemap: ${site}/sitemap.xml`;
  }
  return new Response(body + "\n", { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
