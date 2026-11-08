import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

export const revalidate = 3600;

/** Sitemap with English and Bangla alternates and product images. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const entry = (path: string, lastModified?: string, priority = 0.6, images?: string[]): MetadataRoute.Sitemap[number] => ({
    url: `${site}${path}`, lastModified: lastModified ? new Date(lastModified) : undefined, priority,
    alternates: { languages: { en: `${site}${path}`, bn: `${site}/bn${path === "/" ? "" : path}` } }, images,
  });
  const base = ["/", "/shop", "/deals", "/categories", "/blog", "/faq", "/contact", "/track-order"].map((p) => entry(p, undefined, p === "/" ? 1 : 0.7));
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return base;

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const [products, categories, pages, posts, ptypes] = await Promise.all([
    db.from("products").select("slug,updated_at,seo,product_media(url,type,sort_order)").eq("status", "published").lte("published_at", new Date().toISOString()).limit(45000),
    db.from("categories").select("slug,updated_at,seo"),
    db.from("pages").select("slug,updated_at,seo,kind").eq("is_published", true),
    db.from("blog_posts").select("slug,updated_at,seo,post_type"),
    db.from("settings").select("value").eq("key", "post_types").maybeSingle(),
  ]);
  const cfg = ((await db.from("settings").select("value").eq("key", "seo").maybeSingle()).data?.value as { sitemap?: Record<string, boolean>; noindex_site?: boolean } | null) ?? {};
  if (cfg.noindex_site) return [];
  const on = (k: string) => cfg.sitemap?.[k] !== false;
  const noindex = (r: { seo?: { noindex?: boolean } | null }) => !r.seo?.noindex;
  return [
    ...base,
    ...(!on("categories") ? [] : categories.data ?? []).filter(noindex).map((c) => entry(`/category/${c.slug}`, c.updated_at, 0.8)),
    ...(!on("products") ? [] : products.data ?? []).filter(noindex).map((p) => entry(`/product/${p.slug}`, p.updated_at, 0.9,
      ((p.product_media as { url: string; type: string; sort_order: number }[]) ?? []).filter((m) => m.type === "image").sort((a, b) => a.sort_order - b.sort_order).slice(0, 5).map((m) => m.url))),
    ...(pages.data ?? []).filter(noindex).filter((p) => on(p.kind === "landing" ? "landing" : "pages")).map((p) => entry(`${p.kind === "landing" ? "/lp" : "/pages"}/${p.slug}`, p.updated_at, 0.4)),
    ...(!on("posts") ? [] : posts.data ?? []).filter(noindex).map((p) => {
      const path = (((ptypes.data?.value as { types?: { id: string; path: string }[] })?.types ?? []).find((t) => t.id === p.post_type)?.path) ?? (p.post_type === "post" ? "blog" : p.post_type);
      return entry(`/${path}/${p.slug}`, p.updated_at, 0.6);
    }),
  ];
}
