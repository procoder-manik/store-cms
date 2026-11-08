import "server-only";
import { getSettingValue } from "@/lib/settings/server";

export interface ImportPricing {
  rates: Record<string, number>; markup_percent: number; markup_fixed: number;
  rounding: "none" | "nearest_10" | "ends_9" | "nearest_50"; default_status: "draft" | "published"; max_images: number; copy_video: boolean;
}

export async function getImportPricing(): Promise<ImportPricing> {
  const s = await getSettingValue<Record<string, unknown>>("import");
  const rates = { USD: 122, CNY: 17, CAD: 88, EUR: 132, GBP: 155, AUD: 80, INR: 1.45, AED: 33, SGD: 90, MYR: 26, THB: 3.4, PKR: 0.43, JPY: 0.8, BDT: 1, ...(s.rates as Record<string, number> | undefined) };
  if (s.usd_to_bdt) rates.USD = Number(s.usd_to_bdt);
  if (s.cny_to_bdt) rates.CNY = Number(s.cny_to_bdt);
  if (s.cad_to_bdt) rates.CAD = Number(s.cad_to_bdt);
  return {
    rates, markup_percent: Number(s.markup_percent ?? 60), markup_fixed: Number(s.markup_fixed ?? 0),
    rounding: (s.rounding as ImportPricing["rounding"]) ?? "nearest_10", default_status: (s.default_status as "draft") ?? "draft",
    max_images: Number(s.max_images ?? 38), copy_video: s.copy_video !== false,
  };
}

/** Source price -> selling price in BDT: convert, add markup, round. */
export function toBDT(amount: number, currency: string, p: ImportPricing, withMarkup = true) {
  const rate = p.rates[currency.toUpperCase()] ?? p.rates.USD ?? 122;
  let v = amount * rate;
  if (withMarkup) v = v * (1 + p.markup_percent / 100) + p.markup_fixed;
  switch (p.rounding) {
    case "nearest_10": return Math.max(10, Math.round(v / 10) * 10);
    case "nearest_50": return Math.max(50, Math.round(v / 50) * 50);
    case "ends_9": return Math.max(9, Math.ceil(v / 10) * 10 - 1);
    default: return Math.round(v);
  }
}
