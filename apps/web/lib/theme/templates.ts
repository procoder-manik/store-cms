import type { CardId } from "./presets";

/** Page templates: how the product page, shop, blog archive and single post look. Edited in Admin > Design > Page templates. */
export interface Templates {
  product: { gallery: "thumbs-bottom" | "thumbs-left"; info: "stacked" | "tabs" | "accordion"; breadcrumb: boolean; trust: boolean; share: boolean; specs: boolean; reviews: boolean; related: boolean; recent: boolean; sticky_bar: boolean };
  shop: { columns: 2 | 3 | 4 | 5; filters: "sidebar" | "none"; per_page: 12 | 24 | 36 | 48; card: "" | CardId; show_count: boolean };
  blog: { layout: "grid" | "list" | "magazine"; columns: 2 | 3; featured: boolean; filters: boolean; sidebar: boolean; per_page: 6 | 9 | 12 | 18; excerpt: boolean; meta: boolean; intro_title: string; intro_text: string };
  post: { toc: boolean; progress: boolean; author: boolean; share: boolean; tags: boolean; products: boolean; related: boolean; prev_next: boolean; sidebar: boolean };
}

export const DEFAULT_TEMPLATES: Templates = {
  product: { gallery: "thumbs-bottom", info: "stacked", breadcrumb: true, trust: true, share: true, specs: true, reviews: true, related: true, recent: true, sticky_bar: true },
  shop: { columns: 4, filters: "sidebar", per_page: 24, card: "", show_count: true },
  blog: { layout: "grid", columns: 3, featured: true, filters: true, sidebar: false, per_page: 9, excerpt: true, meta: true, intro_title: "", intro_text: "" },
  post: { toc: true, progress: true, author: true, share: true, tags: true, products: true, related: true, prev_next: true, sidebar: false },
};

export function resolveTemplates(saved: unknown): Templates {
  const s = (saved ?? {}) as Partial<Record<keyof Templates, Record<string, unknown>>>;
  return {
    product: { ...DEFAULT_TEMPLATES.product, ...s.product },
    shop: { ...DEFAULT_TEMPLATES.shop, ...s.shop },
    blog: { ...DEFAULT_TEMPLATES.blog, ...s.blog },
    post: { ...DEFAULT_TEMPLATES.post, ...s.post },
  } as Templates;
}
