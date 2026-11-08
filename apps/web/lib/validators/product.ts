import { z } from "zod";
import { seoSchema } from "./seo";

const money = z.coerce.number().min(0).max(10_000_000);
const optMoney = z.union([money, z.literal(""), z.null()]).optional().transform((v) => (v === "" || v == null ? null : v));

export const productSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(2, "Enter a product title.").max(200),
  title_bn: z.string().trim().max(200).optional().default(""),
  slug: z.string().trim().max(120).optional().default(""),
  short_description: z.string().trim().max(500).optional().default(""),
  description_html: z.string().max(100_000).optional().default(""),
  status: z.enum(["draft", "published", "scheduled", "archived"]),
  published_at: z.string().optional().default(""),
  price: money,
  compare_at_price: optMoney,
  cost_price: optMoney,
  sku: z.string().trim().max(64).optional().default(""),
  barcode: z.string().trim().max(64).optional().default(""),
  stock: z.coerce.number().int().min(0).max(1_000_000).default(0),
  track_inventory: z.boolean().default(true),
  allow_backorder: z.boolean().default(false),
  low_stock_threshold: z.coerce.number().int().min(0).default(5),
  weight_grams: z.union([z.coerce.number().int().min(0), z.literal("")]).optional().transform((v) => (v === "" || v == null ? null : v)),
  is_featured: z.boolean().default(false),
  category_ids: z.array(z.string().uuid()).default([]),
  tags: z.array(z.string().trim().max(40)).max(30).default([]),
  brand_id: z.string().uuid().nullable().optional().default(null),
  specs: z.array(z.object({ label: z.string().trim().max(80), value: z.string().trim().max(300) })).max(60).default([]),
  size_guide_html: z.string().max(20_000).optional().default(""),
  media: z.array(z.object({
    type: z.enum(["image", "video"]), url: z.string().url(), thumbnail_url: z.string().url().nullable().optional(),
    alt: z.string().max(200).optional().default(""), option_value: z.string().max(80).optional().default(""),
  })).max(40).default([]),
  options: z.array(z.object({
    name: z.string().trim().min(1).max(40),
    values: z.array(z.object({ value: z.string().trim().min(1).max(60), swatch_hex: z.string().optional().default(""), image_url: z.string().optional().default("") })).min(1).max(50),
  })).max(3).default([]),
  variants: z.array(z.object({
    id: z.string().uuid().optional(),
    option_values: z.record(z.string()),
    sku: z.string().trim().max(64).optional().default(""),
    price: money,
    compare_at_price: optMoney,
    cost_price: optMoney,
    stock: z.coerce.number().int().min(0).default(0),
    image_url: z.string().optional().default(""),
    is_active: z.boolean().default(true),
  })).max(300).default([]),
  seo: seoSchema.default({}),
  shipping_mode: z.enum(["default", "prepaid", "on_delivery", "free"]).default("default"),
  advance_percent: z.union([z.coerce.number().min(0).max(100), z.literal(""), z.null()]).optional().transform((v) => (v === "" || v == null ? null : v)),
  advance_optional: z.boolean().default(true),
  preorder: z.boolean().default(false),
  preorder_ships_at: z.string().max(10).optional().default(""),
  preorder_note: z.string().max(200).optional().default(""),
  badges: z.array(z.enum(["new", "hot", "featured", "bestseller", "limited", "exclusive", "trending"])).max(4).default([]),
  source_platform: z.enum(["manual", "temu", "aliexpress", "alibaba", "other"]).optional(),
  source_url: z.string().optional(),
  source_id: z.string().optional(),
});

export type ProductInput = z.input<typeof productSchema>;
