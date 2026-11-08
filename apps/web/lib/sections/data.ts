import "server-only";
import { createClient } from "@/lib/supabase/server";
import { configured, getAllCategories, getFaqs, listProducts, type ProductCardData } from "@/lib/data/catalog";

type C = Record<string, unknown>;

/** Products for a section, from its source setting (newest, best selling, featured, on sale, category or hand-picked). */
export async function sectionProducts(c: C, fallbackLimit = 8): Promise<ProductCardData[]> {
  const limit = Math.min(24, Math.max(1, Number(c.limit) || fallbackLimit));
  const source = String(c.source ?? "newest");
  if (source === "manual") {
    const ids = (Array.isArray(c.product_ids) ? c.product_ids : []) as string[];
    if (!ids.length) return [];
    const { items } = await listProducts({ ids, pageSize: ids.length });
    return ids.map((id) => items.find((p) => p.id === id)).filter(Boolean) as ProductCardData[];
  }
  if (source === "category" && c.category_id) {
    const all = await getAllCategories();
    const ids = new Set([String(c.category_id)]);
    let grew = true;
    while (grew) { grew = false; for (const x of all) if (x.parentId && ids.has(x.parentId) && !ids.has(x.id)) { ids.add(x.id); grew = true; } }
    return (await listProducts({ categoryIds: [...ids], sort: "popular", pageSize: limit })).items;
  }
  const sort = source === "best_selling" ? "popular" : "newest";
  const { items } = await listProducts({ sort, featured: source === "featured", onSale: source === "on_sale", pageSize: limit });
  // A new store may have no featured products yet: fall back to newest so the section is never empty
  if (!items.length && source === "featured") return (await listProducts({ sort: "newest", pageSize: limit })).items;
  return items;
}

export async function sectionCategories(c: C) {
  const all = await getAllCategories();
  const picked = (Array.isArray(c.categories) ? c.categories : []) as string[];
  const limit = Math.max(1, Number(c.limit) || 8);
  if (picked.length) return picked.map((id) => all.find((x) => x.id === id)).filter(Boolean).slice(0, limit) as typeof all;
  return all.filter((x) => !x.parentId).slice(0, limit);
}

export async function recentQuotes() {
  if (!configured()) return [];
  const { data } = await (await createClient()).from("reviews").select("body,rating,profiles(full_name)").eq("status", "approved").gte("rating", 4).not("body", "is", null).order("created_at", { ascending: false }).limit(6);
  return (data ?? []).map((r) => ({ name: (r.profiles as unknown as { full_name: string | null } | null)?.full_name ?? "Customer", text: r.body as string, rating: r.rating as number }));
}

export async function brandLogos() {
  if (!configured()) return [];
  const { data } = await (await createClient()).from("brands").select("slug,logo_url").not("logo_url", "is", null).limit(16);
  return (data ?? []).map((b) => ({ image: b.logo_url as string, url: `/shop?brand=${b.slug}` }));
}

export async function productPhotos() {
  const { items } = await listProducts({ sort: "newest", pageSize: 8 });
  return items.filter((p) => p.image).map((p) => ({ image: p.image!, url: `/product/${p.slug}` }));
}

export { getFaqs };
