import "server-only";
import { createHmac } from "crypto";
import { getSecretSetting } from "@/lib/settings/server";
import type { ImportedInput } from "./schema";

type Sec = { app_key: string; app_secret: string; access_token: string };

export function aliexpressId(url: URL) {
  return url.pathname.match(/\/item\/(\d+)\.html/)?.[1] ?? url.searchParams.get("productId") ?? null;
}

/** Signed call to the AliExpress Open Platform (IOP) gateway. */
async function call<T>(method: string, params: Record<string, string>): Promise<T> {
  const { public: p, secrets: s } = await getSecretSetting<{ enabled?: boolean }, Sec>("import.aliexpress");
  if (!p.enabled || !s.app_key || !s.app_secret || !s.access_token) throw new Error("AliExpress API is not set up. Add keys in Imports > Settings, or use the browser extension.");
  const all: Record<string, string> = { ...params, app_key: s.app_key, method, sign_method: "sha256", timestamp: String(Date.now()), access_token: s.access_token, format: "json", v: "2.0" };
  const base = Object.keys(all).sort().map((k) => k + all[k]).join("");
  all.sign = createHmac("sha256", s.app_secret).update(base, "utf8").digest("hex").toUpperCase();
  const res = await fetch("https://api-sg.aliexpress.com/sync", { method: "POST", body: new URLSearchParams(all), cache: "no-store" });
  return (await res.json()) as T;
}

const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? v : v && typeof v === "object" ? (Object.values(v)[0] as T[]) ?? [] : []);

export async function fetchAliExpress(url: URL): Promise<ImportedInput> {
  const id = aliexpressId(url);
  if (!id) throw new Error("Could not find the product id in this AliExpress link.");
  const data = await call<Record<string, unknown>>("aliexpress.ds.product.get", { product_id: id, ship_to_country: "BD", target_currency: "USD", target_language: "EN" });
  const resp = data.aliexpress_ds_product_get_response as { result?: Record<string, unknown>; rsp_msg?: string } | undefined;
  const err = data.error_response as { msg?: string } | undefined;
  const r = resp?.result;
  if (!r) throw new Error(err?.msg ?? resp?.rsp_msg ?? "AliExpress returned no product.");

  const base = (r.ae_item_base_info_dto ?? {}) as { subject?: string; detail?: string; mobile_detail?: string };
  const mm = (r.ae_multimedia_info_dto ?? {}) as { image_urls?: string; ae_video_dtos?: unknown };
  const images = (mm.image_urls ?? "").split(";").filter(Boolean);
  const videos = arr<{ media_url?: string; poster_url?: string }>(mm.ae_video_dtos).filter((v) => v.media_url).map((v) => ({ url: v.media_url!, poster: v.poster_url }));
  const skus = arr<Record<string, unknown>>((r.ae_item_sku_info_dtos as Record<string, unknown>) ?? []);

  const optMap = new Map<string, Map<string, string | undefined>>();
  const variants = skus.map((sku) => {
    const props = arr<{ sku_property_name?: string; property_value_definition_name?: string; sku_property_value?: string; sku_image?: string }>(sku.ae_sku_property_dtos);
    const options: Record<string, string> = {};
    let image: string | undefined;
    for (const pr of props) {
      const name = (pr.sku_property_name ?? "Option").replace(/^Ships From$/i, "Ships from");
      if (/ships from/i.test(name)) continue;
      const value = pr.property_value_definition_name || pr.sku_property_value || "";
      if (!value) continue;
      options[name] = value;
      if (!optMap.has(name)) optMap.set(name, new Map());
      if (!optMap.get(name)!.has(value)) optMap.get(name)!.set(value, pr.sku_image);
      image ??= pr.sku_image;
    }
    const sale = Number(sku.offer_sale_price ?? sku.sku_price ?? 0);
    const list = Number(sku.sku_price ?? 0);
    return { options, price: sale, compareAtPrice: list > sale ? list : undefined, stock: Number(sku.sku_available_stock ?? sku.ipm_sku_stock ?? 0), image, sku: String(sku.sku_id ?? "").slice(0, 64) || undefined };
  }).filter((v) => v.price > 0);

  const uniq = new Map<string, (typeof variants)[number]>();
  for (const v of variants) uniq.set(JSON.stringify(v.options), v);
  const vs = [...uniq.values()];
  const props = arr<{ attr_name?: string; attr_value?: string }>(r.ae_item_properties);

  return {
    source: "aliexpress", site: "aliexpress.com", sourceUrl: url.toString(), sourceId: id, title: base.subject ?? `AliExpress ${id}`,
    descriptionHtml: base.detail ?? base.mobile_detail ?? "",
    price: vs.length ? Math.min(...vs.map((v) => v.price)) : 0,
    compareAtPrice: vs.find((v) => v.compareAtPrice)?.compareAtPrice, currency: "USD",
    images, videos,
    options: [...optMap.entries()].map(([name, values]) => ({ name, values: [...values.entries()].map(([value, image]) => ({ value, image })) })),
    variants: optMap.size ? vs : [],
    specs: props.filter((p) => p.attr_name && p.attr_value).map((p) => ({ label: p.attr_name!, value: p.attr_value! })),
  };
}
