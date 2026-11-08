import { z } from "zod";

export const seoSchema = z.object({
  title: z.string().trim().max(70).optional().default(""),
  description: z.string().trim().max(170).optional().default(""),
  canonical: z.string().trim().url().or(z.literal("")).optional().default(""),
  og_image: z.string().trim().url().or(z.literal("")).optional().default(""),
  noindex: z.boolean().optional().default(false),
  nofollow: z.boolean().optional().default(false),
  og_title: z.string().trim().max(95).optional().default(""),
  og_description: z.string().trim().max(200).optional().default(""),
  twitter_card: z.enum(["summary", "summary_large_image"]).optional().default("summary_large_image"),
  keyword: z.string().trim().max(80).optional().default(""),
  breadcrumb_title: z.string().trim().max(60).optional().default(""),
  schemas: z.array(z.object({ id: z.string().max(40), type: z.enum(["FAQPage", "HowTo", "Article", "LocalBusiness", "VideoObject", "Event", "Service", "Custom"]), data: z.record(z.unknown()) })).max(8)
    .refine((a) => JSON.stringify(a).length < 40_000, "Schema is too large").optional().default([]),
});
export type Seo = z.infer<typeof seoSchema>;
