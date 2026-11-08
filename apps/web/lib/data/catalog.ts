import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export interface ProductCardData {
  id: string;
  slug: string;
  title: string;
  price: number;
  compareAtPrice: number | null;
  image: string | null;
  hoverImage: string | null;
  video: string | null;
  rating: number;
  ratingCount: number;
  inStock: boolean;
  hasVariants: boolean;
  preorder: boolean;
  badges: string[];
}

export interface CategoryData {
  id: string;
  name: string;
  nameBn: string | null;
  slug: string;
  icon: string | null;
  imageUrl: string | null;
  parentId?: string | null;
  description?: string | null;
  seo?: Record<string, string | boolean>;
}

export const configured = () => Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

type CatRow = Record<string, unknown>;
const toCategory = (c: CatRow): CategoryData => ({
  id: c.id as string, name: c.name as string, nameBn: (c.name_bn as string) ?? null, slug: c.slug as string,
  icon: (c.icon as string) ?? null, imageUrl: (c.image_url as string) ?? null, parentId: (c.parent_id as string) ?? null,
  description: (c.description as string) ?? null, seo: (c.seo as Record<string, string>) ?? {},
});

export async function getTopCategories(limit = 8): Promise<CategoryData[]> {
  if (!configured()) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("categories").select("*").is("parent_id", null).order("sort_order").limit(limit);
  return (data ?? []).map(toCategory);
}

export const getAllCategories = cache(async (): Promise<CategoryData[]> => {
  if (!configured()) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("categories").select("*").order("sort_order").order("name");
  return (data ?? []).map(toCategory);
});

export async function getCategoryBySlug(slug: string) {
  const all = await getAllCategories();
  const cat = all.find((c) => c.slug === slug);
  if (!cat) return null;
  // Include every descendant so a parent category lists its sub-categories' products too
  const ids = new Set([cat.id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const c of all) if (c.parentId && ids.has(c.parentId) && !ids.has(c.id)) { ids.add(c.id); grew = true; }
  }
  return { category: cat, ids: [...ids], children: all.filter((c) => c.parentId === cat.id), parent: all.find((c) => c.id === cat.parentId) ?? null };
}

type Row = {
  id: string; slug: string; title: string; price: number; compare_at_price: number | null;
  stock: number; track_inventory: boolean; allow_backorder: boolean; rating_avg: number; rating_count: number;
  product_media: { type: "image" | "video"; url: string; thumbnail_url: string | null; sort_order: number }[];
  product_variants?: { count: number }[];
  preorder?: boolean; badges?: string[]; published_at?: string | null;
};

export function toCard(p: Row): ProductCardData {
  const media = [...(p.product_media ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const images = media.filter((m) => m.type === "image");
  const video = media.find((m) => m.type === "video");
  return {
    id: p.id, slug: p.slug, title: p.title, price: Number(p.price),
    compareAtPrice: p.compare_at_price ? Number(p.compare_at_price) : null,
    image: images[0]?.url ?? video?.thumbnail_url ?? null, hoverImage: images[1]?.url ?? null, video: video?.url ?? null,
    rating: Number(p.rating_avg), ratingCount: p.rating_count,
    inStock: !p.track_inventory || p.allow_backorder || !!p.preorder || p.stock > 0,
    hasVariants: (p.product_variants?.[0]?.count ?? 0) > 0,
    preorder: !!p.preorder,
    badges: [...new Set([...(p.badges ?? []), ...(p.published_at && Date.now() - new Date(p.published_at).getTime() < 14 * 86400000 ? ["new"] : [])])].slice(0, 3),
  };
}

export const CARD_SELECT =
  "id,slug,title,price,compare_at_price,stock,track_inventory,allow_backorder,rating_avg,rating_count,published_at,sold_count,preorder,badges,product_media(type,url,thumbnail_url,sort_order),product_variants(count)";

export async function getProducts(source: "newest" | "best_selling" | "featured" | "on_sale", limit = 8) {
  const { items } = await listProducts({ sort: source === "best_selling" ? "popular" : "newest", featured: source === "featured", onSale: source === "on_sale", pageSize: limit });
  return items;
}

export type SortKey = "newest" | "popular" | "price_asc" | "price_desc" | "rating";
export interface ListParams {
  categoryIds?: string[]; q?: string; min?: number; max?: number; inStock?: boolean; rating?: number;
  onSale?: boolean; featured?: boolean; sort?: SortKey; page?: number; pageSize?: number; ids?: string[]; brandId?: string; tagId?: string;
}

export async function listProducts(params: ListParams): Promise<{ items: ProductCardData[]; total: number }> {
  if (!configured()) return { items: [], total: 0 };
  const supabase = await createClient();
  const page = Math.max(1, params.page ?? 1);
  const size = Math.min(60, params.pageSize ?? 24);
  const select = `${CARD_SELECT}${params.categoryIds?.length ? ",product_categories!inner(category_id)" : ""}${params.tagId ? ",product_tags!inner(tag_id)" : ""}`;

  let q = supabase.from("products").select(select, { count: "exact" }).eq("status", "published").lte("published_at", new Date().toISOString());
  if (params.categoryIds?.length) q = q.in("product_categories.category_id", params.categoryIds);
  if (params.tagId) q = q.eq("product_tags.tag_id", params.tagId);
  if (params.brandId) q = q.eq("brand_id", params.brandId);
  if (params.ids?.length) q = q.in("id", params.ids);
  if (params.q) {
    const term = params.q.replace(/[%,()*]/g, " ").trim().slice(0, 80);
    if (term) q = q.or(`title.ilike.%${term}%,title_bn.ilike.%${term}%,sku.ilike.%${term}%`);
  }
  if (params.min != null) q = q.gte("price", params.min);
  if (params.max != null) q = q.lte("price", params.max);
  if (params.inStock) q = q.gt("stock", 0);
  if (params.rating) q = q.gte("rating_avg", params.rating);
  if (params.featured) q = q.eq("is_featured", true);
  if (params.onSale) q = q.not("compare_at_price", "is", null);

  switch (params.sort) {
    case "popular": q = q.order("sold_count", { ascending: false }); break;
    case "price_asc": q = q.order("price", { ascending: true }); break;
    case "price_desc": q = q.order("price", { ascending: false }); break;
    case "rating": q = q.order("rating_avg", { ascending: false }).order("rating_count", { ascending: false }); break;
    default: q = q.order("published_at", { ascending: false });
  }
  const { data, count } = await q.range((page - 1) * size, page * size - 1);
  let items = ((data ?? []) as unknown as Row[]).map(toCard);
  if (params.onSale) items = items.filter((p) => p.compareAtPrice && p.compareAtPrice > p.price);
  return { items, total: count ?? 0 };
}

export interface ProductDetail {
  id: string; slug: string; title: string; titleBn: string | null; shortDescription: string | null; descriptionHtml: string | null;
  price: number; compareAtPrice: number | null; stock: number; trackInventory: boolean; allowBackorder: boolean;
  sku: string | null; specs: { label: string; value: string }[]; sizeGuideHtml: string | null;
  seo: { title?: string; description?: string; canonical?: string; og_image?: string; noindex?: boolean };
  rating: number; ratingCount: number; soldCount: number;
  media: { type: "image" | "video"; url: string; thumbnail: string | null; alt: string | null; optionValue: string | null }[];
  options: { name: string; values: { value: string; swatch: string | null; image: string | null }[] }[];
  variants: { id: string; options: Record<string, string>; price: number; compareAtPrice: number | null; stock: number; image: string | null; sku: string | null }[];
  categories: CategoryData[];
  tags: string[];
  preorder: boolean; preorderShipsAt: string | null; preorderNote: string | null; badges: string[];
}

export const getProductBySlug = cache(async (slug: string): Promise<ProductDetail | null> => {
  if (!configured()) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("*, product_media(*), product_options(name,sort_order,product_option_values(value,swatch_hex,image_url,sort_order)), product_variants(*), product_categories(categories(*)), product_tags(tags(name))")
    .eq("slug", slug).eq("status", "published").maybeSingle();
  if (!data) return null;
  const r = data as Record<string, unknown>;
  type Opt = { name: string; sort_order: number; product_option_values: { value: string; swatch_hex: string | null; image_url: string | null; sort_order: number }[] };
  return {
    id: r.id as string, slug: r.slug as string, title: r.title as string, titleBn: (r.title_bn as string) ?? null,
    shortDescription: (r.short_description as string) ?? null, descriptionHtml: (r.description_html as string) ?? null,
    price: Number(r.price), compareAtPrice: r.compare_at_price == null ? null : Number(r.compare_at_price),
    stock: r.stock as number, trackInventory: r.track_inventory as boolean, allowBackorder: r.allow_backorder as boolean,
    sku: (r.sku as string) ?? null, specs: (r.specs as { label: string; value: string }[]) ?? [], sizeGuideHtml: (r.size_guide_html as string) ?? null,
    seo: (r.seo as ProductDetail["seo"]) ?? {}, rating: Number(r.rating_avg), ratingCount: r.rating_count as number, soldCount: r.sold_count as number,
    media: ((r.product_media as Record<string, unknown>[]) ?? [])
      .sort((a, b) => (a.sort_order as number) - (b.sort_order as number))
      .map((m) => ({ type: m.type as "image" | "video", url: m.url as string, thumbnail: (m.thumbnail_url as string) ?? null, alt: (m.alt as string) ?? null, optionValue: (m.option_value as string) ?? null })),
    options: ((r.product_options as Opt[]) ?? []).sort((a, b) => a.sort_order - b.sort_order).map((o) => ({
      name: o.name,
      values: o.product_option_values.sort((a, b) => a.sort_order - b.sort_order).map((v) => ({ value: v.value, swatch: v.swatch_hex, image: v.image_url })),
    })),
    variants: ((r.product_variants as Record<string, unknown>[]) ?? []).filter((v) => v.is_active).map((v) => ({
      id: v.id as string, options: v.option_values as Record<string, string>, price: Number(v.price),
      compareAtPrice: v.compare_at_price == null ? null : Number(v.compare_at_price), stock: v.stock as number,
      image: (v.image_url as string) ?? null, sku: (v.sku as string) ?? null,
    })),
    categories: ((r.product_categories as unknown as { categories: CatRow | null }[]) ?? []).map((c) => c.categories).filter(Boolean).map((c) => toCategory(c!)),
    tags: ((r.product_tags as unknown as { tags: { name: string } | null }[]) ?? []).map((t) => t.tags?.name ?? "").filter(Boolean),
    preorder: !!r.preorder, preorderShipsAt: (r.preorder_ships_at as string) ?? null, preorderNote: (r.preorder_note as string) ?? null, badges: (r.badges as string[]) ?? [],
  };
});

export async function getRelated(product: ProductDetail, limit = 8) {
  const ids = product.categories.map((c) => c.id);
  if (!ids.length) return getProducts("best_selling", limit);
  const { items } = await listProducts({ categoryIds: ids, sort: "popular", pageSize: limit + 1 });
  return items.filter((p) => p.id !== product.id).slice(0, limit);
}

export async function getReviews(productId: string) {
  if (!configured()) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("reviews")
    .select("id,rating,title,body,media,is_verified,admin_reply,created_at,profiles(full_name)")
    .eq("product_id", productId).eq("status", "approved").order("created_at", { ascending: false }).limit(30);
  return ((data ?? []) as unknown as { id: string; rating: number; title: string | null; body: string | null; is_verified: boolean; admin_reply: string | null; created_at: string; profiles: { full_name: string | null } | null }[]);
}

export async function getQuestions(productId: string) {
  if (!configured()) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("product_questions").select("id,question,answer,created_at")
    .eq("product_id", productId).eq("status", "approved").order("created_at", { ascending: false }).limit(20);
  return (data ?? []) as { id: string; question: string; answer: string | null; created_at: string }[];
}

export async function getBanners(placement: string) {
  if (!configured()) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("banners").select("*").eq("placement", placement).order("sort_order");
  return (data ?? []) as { id: string; title: string | null; subtitle: string | null; image_url: string | null; mobile_image_url: string | null; link_url: string | null }[];
}

export async function getHomeSections() {
  if (!configured()) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("home_sections").select("*").eq("is_active", true).order("sort_order");
  return (data ?? []) as { id: string; type: string; title: string | null; config: Record<string, unknown> }[];
}

export async function getActiveFlashSale() {
  if (!configured()) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("flash_sales").select("id,title,ends_at,flash_sale_items(product_id,sale_price)").limit(1).maybeSingle();
  if (!data) return null;
  const items = (data.flash_sale_items as { product_id: string; sale_price: number }[]) ?? [];
  const { items: cards } = await listProducts({ ids: items.map((i) => i.product_id), pageSize: 12 });
  const priceMap = new Map(items.map((i) => [i.product_id, Number(i.sale_price)]));
  return {
    title: data.title as string, endsAt: data.ends_at as string,
    products: cards.map((c) => ({ ...c, compareAtPrice: Math.max(c.compareAtPrice ?? 0, c.price), price: Math.min(c.price, priceMap.get(c.id) ?? c.price) })),
  };
}

export async function getPage(slug: string) {
  if (!configured()) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("pages").select("id,title,content_html,seo,updated_at,sections").eq("slug", slug).maybeSingle();
  return data as { id: string; title: string; content_html: string | null; seo: Record<string, string>; updated_at: string; sections: unknown[] } | null;
}

export async function getFaqs() {
  if (!configured()) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("faqs").select("id,question,answer,category").order("sort_order");
  return (data ?? []) as { id: string; question: string; answer: string; category: string | null }[];
}

export async function getSetting<T = Record<string, unknown>>(key: string): Promise<T | null> {
  if (!configured()) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("settings").select("value").eq("key", key).maybeSingle();
  return (data?.value as T) ?? null;
}
