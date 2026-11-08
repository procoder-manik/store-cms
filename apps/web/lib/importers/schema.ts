import { z } from "zod";

const url = z.string().trim().url().max(2000);
const money = z.coerce.number().min(0).max(10_000_000);

/** Validates data coming from the browser extension or an API importer. */
export const importedSchema = z.object({
  source: z.enum(["temu", "aliexpress", "alibaba", "other"]),
  site: z.string().max(80).optional().default(""),
  sourceUrl: url,
  sourceId: z.string().max(80).default(""),
  title: z.string().trim().min(2).max(300),
  descriptionHtml: z.string().max(200_000).default(""),
  price: money,
  compareAtPrice: money.optional(),
  currency: z.string().trim().toUpperCase().max(5).default("USD"),
  images: z.array(url).max(60).default([]),
  videos: z.array(z.object({ url, poster: url.optional() })).max(5).default([]),
  options: z.array(z.object({ name: z.string().trim().min(1).max(40), values: z.array(z.object({ value: z.string().trim().min(1).max(80), image: url.optional() })).max(60) })).max(3).default([]),
  variants: z.array(z.object({
    options: z.record(z.string().max(80)), price: money, compareAtPrice: money.optional(), stock: z.coerce.number().int().min(0).max(1_000_000).default(0),
    image: url.optional(), sku: z.string().max(64).optional(),
  })).max(400).default([]),
  specs: z.array(z.object({ label: z.string().trim().max(80), value: z.string().trim().max(300) })).max(80).default([]),
  rating: z.coerce.number().min(0).max(5).optional(),
  reviewCount: z.coerce.number().int().min(0).optional(),
});
export type ImportedInput = z.infer<typeof importedSchema>;
