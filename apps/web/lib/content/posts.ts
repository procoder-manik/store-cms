import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { configured, getSetting } from "@/lib/data/catalog";
import { readPostTypes, type PostType } from "./post-types";

export const getPostTypes = cache(async (): Promise<PostType[]> => readPostTypes(configured() ? await getSetting("post_types").catch(() => null) : null));
export async function postTypeByPath(path: string) { return (await getPostTypes()).find((t) => t.path === path) ?? null; }

export interface PostCard { author?: string | null; id: string; slug: string; title: string; excerpt: string | null; cover_url: string | null; published_at: string; category: string | null; category_slug: string | null }

export async function listPosts(type: string, opts: { category?: string; limit?: number; exclude?: string; offset?: number } = {}) {
  if (!configured()) return [];
  const from = opts.offset ?? 0;
  let q = (await createClient()).from("blog_posts").select("id,slug,title,excerpt,cover_url,published_at,blog_categories(name,slug)").eq("post_type", type).order("published_at", { ascending: false }).range(from, from + (opts.limit ?? 48) - 1);
  if (opts.exclude) q = q.neq("id", opts.exclude);
  const { data } = await q;
  const rows = (data ?? []).map((r) => {
    const c = r.blog_categories as unknown as { name: string; slug: string } | null;
    return { id: r.id as string, slug: r.slug as string, title: r.title as string, excerpt: r.excerpt as string | null, cover_url: r.cover_url as string | null, published_at: r.published_at as string, category: c?.name ?? null, category_slug: c?.slug ?? null };
  });
  return opts.category ? rows.filter((r) => r.category_slug === opts.category) : rows;
}

export async function getPost(type: string, slug: string) {
  if (!configured()) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("blog_posts").select("*, blog_categories(name,slug), profiles(full_name)").eq("post_type", type).eq("slug", slug).maybeSingle();
  if (!data) return null;
  const [prev, next] = await Promise.all([
    supabase.from("blog_posts").select("slug,title,cover_url").eq("post_type", type).lt("published_at", data.published_at).order("published_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("blog_posts").select("slug,title,cover_url").eq("post_type", type).gt("published_at", data.published_at).order("published_at").limit(1).maybeSingle(),
  ]);
  const all = await listPosts(type, { exclude: data.id as string, limit: 24 });
  const cat = (data.blog_categories as { slug: string } | null)?.slug;
  const related = [...all.filter((p) => cat && p.category_slug === cat), ...all.filter((p) => !cat || p.category_slug !== cat)].slice(0, 3);
  return { post: data as Record<string, unknown>, prev: prev.data, next: next.data, related };
}

/** Adds ids to h2/h3 headings and returns a table of contents. */
export function withToc(html: string) {
  const toc: { id: string; text: string; level: 2 | 3 }[] = [];
  const used = new Set<string>();
  const out = html.replace(/<h([23])([^>]*)>([\s\S]*?)<\/h\1>/gi, (_m, lvl: string, attrs: string, inner: string) => {
    const text = inner.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim();
    let id = text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").slice(0, 60) || `section-${toc.length + 1}`;
    while (used.has(id)) id = `${id}-x`;
    used.add(id);
    toc.push({ id, text, level: Number(lvl) as 2 | 3 });
    return `<h${lvl}${attrs.replace(/\sid="[^"]*"/, "")} id="${id}">${inner}</h${lvl}>`;
  });
  return { html: out, toc };
}
