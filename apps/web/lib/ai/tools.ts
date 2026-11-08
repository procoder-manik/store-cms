import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProductBySlug, listProducts, type ProductCardData } from "@/lib/data/catalog";
import { stripTags } from "@/lib/security/sanitize";
import { bdPhone } from "@/lib/validators/auth";

/** Read-only tools the assistant can call. Everything comes from the live database, so answers stay current. */
export const TOOL_DECLARATIONS = [
  { name: "search_products", description: "Search the store catalog. Use for any question about what products exist, prices, or recommendations.",
    parameters: { type: "object", properties: { query: { type: "string", description: "Keywords, in English or Bangla" }, max_price: { type: "number", description: "Maximum price in BDT" }, in_stock_only: { type: "boolean" } }, required: ["query"] } },
  { name: "get_product", description: "Full details of one product: price per size/color, stock, specifications, description.",
    parameters: { type: "object", properties: { slug: { type: "string", description: "Product slug from search results" } }, required: ["slug"] } },
  { name: "get_active_offers", description: "Current public coupon codes and flash sales.", parameters: { type: "object", properties: {} } },
  { name: "get_shipping_info", description: "Delivery charges, delivery time and free delivery threshold, optionally for one district.",
    parameters: { type: "object", properties: { district: { type: "string", description: "Bangladesh district, e.g. Dhaka, Chattogram" } } } },
  { name: "get_policies", description: "Store policies and FAQ: returns, refunds, payment methods, warranty, contact.",
    parameters: { type: "object", properties: { topic: { type: "string" } } } },
  { name: "track_order", description: "Order status. Requires BOTH the order number and the phone number used for the order. Ask the customer for them if missing.",
    parameters: { type: "object", properties: { order_number: { type: "string" }, phone: { type: "string" } }, required: ["order_number", "phone"] } },
];

type Args = Record<string, unknown>;
export interface ToolOutput { result: unknown; products?: ProductCardData[] }
const site = () => process.env.NEXT_PUBLIC_SITE_URL ?? "";

export async function runTool(name: string, args: Args): Promise<ToolOutput> {
  const admin = createAdminClient();
  switch (name) {
    case "search_products": {
      const q = String(args.query ?? "").slice(0, 80);
      let { items } = await listProducts({ q, max: typeof args.max_price === "number" ? args.max_price : undefined, inStock: !!args.in_stock_only, sort: "popular", pageSize: 6 });
      if (!items.length && q.includes(" ")) items = (await listProducts({ q: q.split(" ").sort((a, b) => b.length - a.length)[0], sort: "popular", pageSize: 6 })).items;
      return {
        products: items,
        result: items.length ? items.map((p) => ({ slug: p.slug, title: p.title, price_bdt: p.price, was_bdt: p.compareAtPrice, in_stock: p.inStock, rating: p.ratingCount ? p.rating : null, has_options: p.hasVariants, url: `${site()}/product/${p.slug}` }))
          : { found: 0, note: "No matching products. Suggest browsing categories or different words." },
      };
    }
    case "get_product": {
      const p = await getProductBySlug(String(args.slug ?? ""));
      if (!p) return { result: { error: "not found" } };
      const tracked = p.trackInventory && !p.allowBackorder;
      return {
        products: [{ id: p.id, slug: p.slug, title: p.title, price: p.price, compareAtPrice: p.compareAtPrice, image: p.media.find((m) => m.type === "image")?.url ?? null, hoverImage: null, video: null, rating: p.rating, ratingCount: p.ratingCount, inStock: !tracked || p.preorder || p.stock > 0, hasVariants: p.variants.length > 0, preorder: p.preorder, badges: p.badges }],
        result: {
          title: p.title, price_bdt: p.price, was_bdt: p.compareAtPrice, rating: p.rating, reviews: p.ratingCount, url: `${site()}/product/${p.slug}`,
          in_stock: !tracked || p.stock > 0, summary: p.shortDescription, description: stripTags(p.descriptionHtml).slice(0, 1200),
          specs: p.specs.slice(0, 20), options: p.options.map((o) => ({ name: o.name, values: o.values.map((v) => v.value) })),
          variants: p.variants.slice(0, 40).map((v) => ({ options: v.options, price_bdt: v.price, in_stock: !tracked || v.stock > 0 })),
        },
      };
    }
    case "get_active_offers": {
      const now = new Date().toISOString();
      const [{ data: coupons }, { data: sales }] = await Promise.all([
        admin.from("coupons").select("code,description,type,value,min_order,max_discount,ends_at").eq("is_active", true).eq("is_public", true).or(`ends_at.is.null,ends_at.gt.${now}`).or(`starts_at.is.null,starts_at.lte.${now}`).limit(10),
        admin.from("flash_sales").select("title,ends_at,flash_sale_items(sale_price,products(title,slug))").eq("is_active", true).lte("starts_at", now).gt("ends_at", now).limit(3),
      ]);
      return { result: { coupons: coupons ?? [], flash_sales: (sales ?? []).map((s) => ({ title: s.title, ends_at: s.ends_at, items: ((s.flash_sale_items as unknown as { sale_price: number; products: { title: string; slug: string } }[]) ?? []).slice(0, 8).map((i) => ({ title: i.products?.title, sale_price_bdt: i.sale_price, url: `${site()}/product/${i.products?.slug}` })) })) } };
    }
    case "get_shipping_info": {
      const { data } = await admin.from("shipping_zones").select("name,districts,base_rate,per_kg_rate,free_over,eta_min_days,eta_max_days").eq("is_active", true).order("sort_order");
      const zones = data ?? [];
      const d = String(args.district ?? "").trim().toLowerCase();
      const zone = d ? zones.find((z) => (z.districts as string[]).some((x) => x.toLowerCase() === d)) ?? zones.find((z) => !(z.districts as string[]).length) : null;
      return { result: { zone_for_district: zone ?? null, all_zones: zones.map((z) => ({ ...z, districts: (z.districts as string[]).length ? z.districts : "all other districts" })), cash_on_delivery: true } };
    }
    case "get_policies": {
      const [{ data: kb }, { data: faqs }, { data: pages }] = await Promise.all([
        admin.from("chatbot_knowledge").select("title,content").eq("is_active", true).limit(30),
        admin.from("faqs").select("question,answer").eq("is_active", true).limit(30),
        admin.from("pages").select("title,content_html").in("slug", ["return-policy", "shipping-policy", "terms"]),
      ]);
      return { result: { knowledge: kb ?? [], faq: faqs ?? [], pages: (pages ?? []).map((p) => ({ title: p.title, text: stripTags(p.content_html as string).slice(0, 1500) })) } };
    }
    case "track_order": {
      const phone = bdPhone.safeParse(String(args.phone ?? ""));
      const num = String(args.order_number ?? "").trim().toUpperCase().replace(/^(?!ORD-)/, "ORD-");
      if (!phone.success || !/^ORD-\d+$/.test(num)) return { result: { error: "Need a valid order number (like ORD-100123) and the phone number used for the order." } };
      const { data: o } = await admin.from("orders").select("order_number,status,payment_status,payment_method,grand_total,courier,tracking_code,placed_at,access_token,order_status_history(to_status,created_at)").eq("order_number", num).eq("phone", phone.data).maybeSingle();
      if (!o) return { result: { error: "No order matches that number and phone." } };
      return { result: {
        order_number: o.order_number, status: o.status, payment: `${o.payment_method} (${o.payment_status})`, total_bdt: o.grand_total, placed_at: o.placed_at,
        courier: o.courier, tracking_code: o.tracking_code, history: o.order_status_history, order_page: `${site()}/order/${o.order_number}?t=${o.access_token}`,
      } };
    }
    default:
      return { result: { error: "unknown tool" } };
  }
}
