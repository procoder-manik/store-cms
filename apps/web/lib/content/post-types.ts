export interface PostType { id: string; label: string; label_bn?: string; path: string; layout?: "classic" | "magazine" | "minimal" }

export const DEFAULT_POST_TYPES: PostType[] = [
  { id: "post", label: "Blog", label_bn: "ব্লগ", path: "blog" },
  { id: "news", label: "News", label_bn: "খবর", path: "news" },
  { id: "guide", label: "Buying guides", label_bn: "কেনার গাইড", path: "guides" },
  { id: "lookbook", label: "Lookbook", label_bn: "লুকবুক", path: "lookbook" },
];

/** URL segments used by the store itself, never available as a post type path. */
export const RESERVED_PATHS = new Set(["shop", "cart", "checkout", "product", "category", "categories", "pages", "lp", "account", "search", "deals", "compare", "faq", "contact",
  "track-order", "order", "invoice", "login", "register", "forgot-password", "reset-password", "verify-email", "admin", "api", "bn", "en", "sitemap.xml", "robots.txt"]);

export function readPostTypes(v: unknown): PostType[] {
  const list = ((v as { types?: PostType[] } | null)?.types ?? []).filter((t) => t?.id && t?.path && !RESERVED_PATHS.has(t.path));
  return list.length ? list : DEFAULT_POST_TYPES;
}
