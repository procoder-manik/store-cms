import "server-only";
import { storeRemoteFile } from "@/lib/storage";
import { sanitizeRich } from "@/lib/security/sanitize";
import { slugify } from "@/lib/utils";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ProductInput } from "@/lib/validators/product";
import type { ImportedInput } from "./schema";
import { toBDT, type ImportPricing } from "./pricing";

/** One product can hold 40 media items; keep room for the video. */
export const MAX_IMPORT_IMAGES = 38;

export interface ImportChoices {
  title: string; price?: number | null; status: "draft" | "published"; categoryIds: string[];
  includeImages: string[]; includeVideo: boolean; copyDescriptionImages: boolean;
}

/** Copies media to our storage (in parallel, failures skipped) and maps a URL to its copy. */
async function copyAll(urls: string[], folder: string, maxMb: number) {
  const out = new Map<string, string>();
  const unique = [...new Set(urls)];
  for (let i = 0; i < unique.length; i += 6) {
    await Promise.all(unique.slice(i, i + 6).map(async (u) => {
      try {
        const r = await storeRemoteFile(u, folder, maxMb);
        out.set(u, r.url);
        await createAdminClient().from("media").insert({ storage_key: r.key, url: r.url, mime: r.mime, size_bytes: r.size, folder, alt: null });
      } catch (e) { console.warn("import media skipped", u, e instanceof Error ? e.message : e); }
    }));
  }
  return out;
}

export async function buildProductFromImport(src: ImportedInput, choice: ImportChoices, pricing: ImportPricing): Promise<ProductInput> {
  const images = src.images.filter((u) => choice.includeImages.includes(u)).slice(0, MAX_IMPORT_IMAGES);
  const optionImages = src.options.flatMap((o) => o.values.map((v) => v.image).filter(Boolean) as string[]).slice(0, 30);
  const descImages = choice.copyDescriptionImages ? [...src.descriptionHtml.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)].map((m) => m[1]!).filter((u) => /^https?:/.test(u)).slice(0, 20) : [];
  const imageMap = await copyAll([...images, ...optionImages, ...descImages], "imports", 10);
  const video = choice.includeVideo && pricing.copy_video ? src.videos[0] : undefined;
  const videoMap = video ? await copyAll([video.url], "imports", 50) : new Map<string, string>();

  let description = sanitizeRich(src.descriptionHtml);
  for (const [from, to] of imageMap) description = description.split(from).join(to);
  if (!choice.copyDescriptionImages) description = description.replace(/<img[^>]*>/gi, "");

  const price = (n: number) => toBDT(n, src.currency, pricing);
  const basePrice = choice.price ?? price(src.price);
  const compare = src.compareAtPrice && src.compareAtPrice > src.price ? price(src.compareAtPrice) : null;
  const ratio = choice.price && src.price ? choice.price / price(src.price) : 1;

  const media: ProductInput["media"] = [
    ...(video && videoMap.get(video.url) ? [{ type: "video" as const, url: videoMap.get(video.url)!, thumbnail_url: null, alt: "", option_value: "" }] : []),
    ...images.filter((u) => imageMap.has(u)).map((u) => ({ type: "image" as const, url: imageMap.get(u)!, thumbnail_url: null, alt: choice.title.slice(0, 120), option_value: "" })),
  ];
  // Video stays first on the product page. Cards still show the first photo and play the video on hover.

  return {
    title: choice.title, slug: slugify(choice.title), status: choice.status, price: basePrice, compare_at_price: compare,
    cost_price: Math.round(toBDT(src.price, src.currency, pricing, false)), description_html: description,
    stock: src.variants.length ? 0 : 50, track_inventory: true, category_ids: choice.categoryIds, tags: [],
    specs: src.specs.slice(0, 40), media,
    options: src.options.map((o) => ({ name: o.name, values: o.values.map((v) => ({ value: v.value, swatch_hex: "", image_url: (v.image && imageMap.get(v.image)) || "" })) })),
    variants: src.variants.slice(0, 300).map((v) => ({
      option_values: v.options, price: Math.round(price(v.price) * ratio / 10) * 10 || basePrice,
      compare_at_price: v.compareAtPrice ? price(v.compareAtPrice) : null, cost_price: Math.round(toBDT(v.price, src.currency, pricing, false)),
      stock: v.stock > 0 ? Math.min(v.stock, 999) : 0, sku: "", image_url: (v.image && imageMap.get(v.image)) || "", is_active: true,
    })),
    seo: {}, source_platform: src.source, source_url: src.sourceUrl, source_id: src.sourceId,
  };
}
