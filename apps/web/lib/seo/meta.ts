import type { Metadata } from "next";
import type { SeoData } from "./model";

/** Builds page metadata from the SEO panel plus sensible fallbacks. Used by products, categories, pages, posts and landing pages. */
export function buildMetadata(o: {
  seo?: SeoData | null; title: string; description?: string | null; image?: string | null; path: string; type?: "website" | "article" | "product";
  languages?: Record<string, string>; publishedTime?: string; noindexDefault?: boolean;
}): Metadata {
  const seo = o.seo ?? {};
  const title = seo.title || o.title;
  const description = seo.description || o.description || undefined;
  const image = seo.og_image || o.image || undefined;
  const noindex = seo.noindex ?? o.noindexDefault ?? false;
  return {
    title, description,
    alternates: { canonical: seo.canonical || o.path, ...(o.languages ? { languages: o.languages } : {}) },
    robots: noindex || seo.nofollow ? { index: !noindex, follow: !seo.nofollow } : undefined,
    openGraph: { type: o.type === "product" ? "website" : o.type ?? "website", title: seo.og_title || title, description: seo.og_description || description, images: image ? [{ url: image }] : undefined, ...(o.publishedTime ? { publishedTime: o.publishedTime } : {}) },
    twitter: { card: seo.twitter_card ?? (image ? "summary_large_image" : "summary"), title: seo.og_title || title, description: seo.og_description || description, images: image ? [image] : undefined },
  };
}
