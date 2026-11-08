import type { SourcePlatform } from "@/types/domain";

/** Normalised product shape produced by every importer (Temu, AliExpress, Alibaba). */
export interface ImportedProduct {
  source: Exclude<SourcePlatform, "manual">;
  sourceUrl: string;
  sourceId: string;
  title: string;
  descriptionHtml: string;
  price: number;
  compareAtPrice?: number;
  currency: "USD" | "CNY" | "BDT" | "CAD" | string;
  images: string[];
  videos: { url: string; poster?: string }[];
  options: { name: string; values: { value: string; image?: string }[] }[];
  variants: {
    options: Record<string, string>;
    price: number;
    compareAtPrice?: number;
    stock: number;
    image?: string;
    sku?: string;
  }[];
  specs: { label: string; value: string }[];
  rating?: number;
  reviewCount?: number;
}

export interface Importer {
  platform: ImportedProduct["source"];
  matches(url: URL): boolean;
  /** Server-side fetch (works for AliExpress API; Temu/Alibaba use the browser extension). */
  fetchProduct?(url: URL): Promise<ImportedProduct>;
}
