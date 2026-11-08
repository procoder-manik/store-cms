"use server";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { processEmailQueue } from "@/lib/email/worker";
import { sendMetaPurchase } from "@/lib/tracking/capi";
import { cookies } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { findCart, readCart, type CartView } from "@/lib/cart/server";
import { rateLimit } from "@/lib/security/ratelimit";
import { requestMeta } from "@/lib/security/request";
import { verifyTurnstile } from "@/lib/security/turnstile";
import { bdPhone } from "@/lib/validators/auth";
import { ALL_DISTRICTS, divisionOf } from "@/lib/data/bd-locations";
import { listProducts, type ProductCardData } from "@/lib/data/catalog";
import type { ActionResult } from "@/lib/actions/result";
import { enabledPaymentMethods, startOnlinePayment } from "@/lib/payments";
import { safeEqual } from "@/lib/security/crypto";

const uuid = z.string().uuid();

async function userId() {
  const { data } = await (await createClient()).auth.getUser();
  return data.user?.id ?? null;
}
async function limited(scope: string, limit: number, windowSec = 600) {
  const { ip } = await requestMeta();
  return !(await rateLimit(`${scope}:${ip ?? "x"}`, limit, windowSec)).ok;
}

// ------------------------------------------------------------------ Cart
export async function getCartAction(): Promise<CartView> {
  return readCart();
}

export async function addToCartAction(productId: string, variantId: string | null, quantity = 1): Promise<ActionResult<CartView>> {
  if (!uuid.safeParse(productId).success || (variantId && !uuid.safeParse(variantId).success)) return { ok: false, error: "invalid" };
  if (await limited("cart", 120)) return { ok: false, error: "rate" };
  const qty = Math.max(1, Math.min(99, Math.floor(quantity)));
  const admin = createAdminClient();
  const { data: prod } = await admin.from("products").select("id,status,product_variants(id,is_active)").eq("id", productId).maybeSingle();
  if (!prod || prod.status !== "published") return { ok: false, error: "unavailable" };
  const variants = (prod.product_variants as { id: string; is_active: boolean }[]) ?? [];
  if (variants.some((v) => v.is_active) && !variantId) return { ok: false, error: "choose_variant" };
  if (variantId && !variants.some((v) => v.id === variantId && v.is_active)) return { ok: false, error: "unavailable" };

  const cartId = (await findCart(true))!;
  let q = admin.from("cart_items").select("id,quantity").eq("cart_id", cartId).eq("product_id", productId);
  q = variantId ? q.eq("variant_id", variantId) : q.is("variant_id", null);
  const { data: existing } = await q.maybeSingle();
  if (existing) await admin.from("cart_items").update({ quantity: Math.min(99, (existing.quantity as number) + qty), saved_for_later: false }).eq("id", existing.id);
  else await admin.from("cart_items").insert({ cart_id: cartId, product_id: productId, variant_id: variantId, quantity: qty });
  await admin.from("carts").update({ last_activity_at: new Date().toISOString(), recovery_stage: 0 }).eq("id", cartId);
  return { ok: true, data: await readCart(cartId) };
}

export async function updateCartItemAction(itemId: string, quantity: number): Promise<ActionResult<CartView>> {
  if (!uuid.safeParse(itemId).success) return { ok: false, error: "invalid" };
  const cartId = await findCart(false);
  if (!cartId) return { ok: false, error: "invalid" };
  const admin = createAdminClient();
  if (quantity <= 0) await admin.from("cart_items").delete().eq("id", itemId).eq("cart_id", cartId);
  else await admin.from("cart_items").update({ quantity: Math.min(99, Math.floor(quantity)) }).eq("id", itemId).eq("cart_id", cartId);
  return { ok: true, data: await readCart(cartId) };
}

// ------------------------------------------------------------------ Checkout
const itemSchema = z.object({ product_id: uuid, variant_id: uuid.nullable().optional(), quantity: z.number().int().min(1).max(99) });
const quoteSchema = z.object({
  items: z.array(itemSchema).max(50).optional(),
  useCart: z.boolean().optional(),
  district: z.string().max(40).optional().default(""),
  coupon: z.string().trim().max(40).optional().default(""),
  phone: z.string().max(20).optional().default(""),
  email: z.string().max(120).optional().default(""),
  use_rewards: z.boolean().optional().default(false),
});
export type QuoteInput = z.input<typeof quoteSchema>;
export interface QuoteLine { product_id: string; variant_id: string | null; title: string; variant_title: string | null; image_url: string | null; unit_price: number; compare_at_price: number | null; quantity: number; total: number; slug: string }
export interface Quote {
  lines: QuoteLine[]; errors: { product_id: string; variant_id?: string; error: string; available?: number }[];
  subtotal: number; discount: number; shipping: number; grand_total: number;
  zone: { name: string; eta_min: number; eta_max: number } | null;
  coupon: { code: string; valid: boolean; error: string | null; free_shipping: boolean } | null;
  shipping_hidden?: boolean;
  advance?: { amount: number; required: boolean; shipping_prepaid: boolean; items_amount: number };
  rewards?: { referral_percent: number; referral_discount: number; referral_available: number; points_used: number; points_discount: number };
}

async function resolveItems(input: { items?: z.infer<typeof itemSchema>[]; useCart?: boolean }) {
  if (!input.useCart) return { items: input.items ?? [], cartId: null as string | null };
  const cart = await readCart();
  return { items: cart.lines.map((l) => ({ product_id: l.productId, variant_id: l.variantId, quantity: l.quantity })), cartId: cart.id };
}

export async function quoteAction(input: QuoteInput): Promise<Quote | null> {
  const parsed = quoteSchema.safeParse(input);
  if (!parsed.success) return null;
  if (await limited("quote", 200)) return null;
  const { items, cartId } = await resolveItems(parsed.data);
  const uid = await userId();
  const phone = bdPhone.safeParse(parsed.data.phone);
  const em = z.string().email().safeParse(parsed.data.email);
  if (cartId && (phone.success || em.success)) {
    await createAdminClient().from("carts").update({ ...(phone.success && { phone: phone.data }), ...(em.success && { email: em.data.toLowerCase() }) }).eq("id", cartId);
  }
  const { data } = await createAdminClient().rpc("quote_order", {
    p: { items, district: parsed.data.district, coupon_code: parsed.data.coupon, user_id: uid, phone: phone.success ? phone.data : null, use_rewards: parsed.data.use_rewards },
  });
  return (data as Quote) ?? null;
}

const orderSchema = z.object({
  items: z.array(itemSchema).max(50).optional(),
  useCart: z.boolean().optional(),
  name: z.string().trim().min(2, "name").max(80, "name"),
  phone: bdPhone,
  email: z.string().trim().toLowerCase().email("email").or(z.literal("")).optional().default(""),
  district: z.string().refine((d) => ALL_DISTRICTS.includes(d), "district"),
  upazila: z.string().trim().max(60).optional().default(""),
  address: z.string().trim().min(5, "address").max(300, "address"),
  note: z.string().trim().max(500).optional().default(""),
  coupon: z.string().trim().max(40).optional().default(""),
  payment_method: z.enum(["cod", "sslcommerz", "bkash"]).default("cod"),
  source: z.enum(["web", "quick_checkout"]).default("web"),
  turnstile: z.string().optional(),
  pay_advance: z.boolean().optional().default(false),
  use_rewards: z.boolean().optional().default(false),
  custom_fields: z.record(z.string().max(500)).optional().default({}),
});
export type OrderInput = z.input<typeof orderSchema>;

const ORDER_ERRORS: Record<string, string> = {
  empty_cart: "empty", cart_error: "stock", out_of_stock: "stock", coupon_error: "coupon", advance_needs_online: "advance",
};

export async function placeOrderAction(input: OrderInput): Promise<ActionResult<{ orderNumber: string; token: string; paymentRedirect?: string | null }>> {
  const parsed = orderSchema.safeParse(input);
  if (!parsed.success) {
    const fe: Record<string, string> = {};
    parsed.error.issues.forEach((i) => { fe[String(i.path[0])] ??= i.message; });
    return { ok: false, error: "form", fieldErrors: fe };
  }
  const d = parsed.data;
  const { ip, userAgent } = await requestMeta();
  if (!(await rateLimit(`order:${ip ?? "x"}`, 8, 900)).ok || !(await rateLimit(`order-phone:${d.phone}`, 5, 900)).ok) return { ok: false, error: "rate" };
  const uid = await userId();
  if (!uid && !(await verifyTurnstile(d.turnstile, ip))) return { ok: false, error: "captcha" };

  const checkout = (await createAdminClient().from("settings").select("value").eq("key", "checkout").maybeSingle()).data?.value as { guest_checkout?: boolean } | undefined;
  if (!(await enabledPaymentMethods()).includes(d.payment_method)) return { ok: false, error: "payment" };
  if (!uid && checkout?.guest_checkout === false) return { ok: false, error: "login" };

  const { items, cartId } = await resolveItems(d);
  if (!items.length) return { ok: false, error: "empty" };

  // Store-defined checkout fields (Settings > Checkout fields)
  const cfg = ((await createAdminClient().from("settings").select("value").eq("key", "checkout_fields").maybeSingle()).data?.value ?? {}) as {
    email?: { required?: boolean }; upazila?: { required?: boolean }; custom?: { key: string; required?: boolean }[] };
  const missing: Record<string, string> = {};
  if (cfg.email?.required && !d.email) missing.email = "email";
  if (cfg.upazila?.required && !d.upazila) missing.upazila = "required";
  const customOut: Record<string, string> = {};
  for (const f of cfg.custom ?? []) {
    const v = String(d.custom_fields[f.key] ?? "").trim().slice(0, 500);
    if (f.required && !v) missing[`cf_${f.key}`] = "required";
    if (v) customOut[f.key] = v;
  }
  if (Object.keys(missing).length) return { ok: false, error: "form", fieldErrors: missing };

  const { data, error } = await createAdminClient().rpc("place_order", {
    p: {
      items, user_id: uid, cart_id: cartId, coupon_code: d.coupon, district: d.district, phone: d.phone,
      payment_method: d.payment_method, source: d.source, note: d.note, ip, user_agent: userAgent?.slice(0, 300),
      pay_advance: d.pay_advance, custom_fields: customOut, use_rewards: !!uid && d.use_rewards,
      customer: { name: d.name, phone: d.phone, email: d.email },
      address: { division: divisionOf(d.district), district: d.district, upazila: d.upazila, address_line: d.address },
    },
  });
  if (error) {
    const key = Object.keys(ORDER_ERRORS).find((k) => error.message.includes(k));
    return { ok: false, error: key ? ORDER_ERRORS[key]! : "generic" };
  }
  const res = data as { id: string; order_number: string; access_token: string };
  let paymentRedirect: string | null = null;
  if (d.payment_method !== "cod") {
    try {
      paymentRedirect = await startOnlinePayment(res.id, d.payment_method);
    } catch (e) {
      console.error("payment init failed", e);
      await createAdminClient().rpc("mark_payment_failed", { p_order: res.id, p_gateway: d.payment_method, p_raw: { error: String(e) } });
    }
  }
  const jar = await cookies();
  const fb = { fbp: jar.get("_fbp")?.value, fbc: jar.get("_fbc")?.value };
  after(() => processEmailQueue(5).catch(() => {}));
  after(() => sendMetaPurchase(res.id, { ip, userAgent, ...fb }).catch(() => {}));
  return { ok: true, data: { orderNumber: res.order_number, token: res.access_token, paymentRedirect } };
}

/** Lets a customer retry a failed online payment, or switch the order to cash on delivery. */
export async function retryPaymentAction(orderNumber: string, token: string, method: "sslcommerz" | "bkash" | "cod"): Promise<ActionResult<{ redirect: string | null }>> {
  if (await limited("retry-pay", 10)) return { ok: false, error: "rate" };
  const admin = createAdminClient();
  const { data: o } = await admin.from("orders").select("id,access_token,status,payment_status").eq("order_number", orderNumber).maybeSingle();
  if (!o || !safeEqual(token, o.access_token as string) || o.status !== "pending" || o.payment_status === "paid") return { ok: false, error: "generic" };
  if (method === "cod") {
    await admin.rpc("switch_to_cod", { p_order: o.id });
    return { ok: true, data: { redirect: null } };
  }
  if (!(await enabledPaymentMethods()).includes(method)) return { ok: false, error: "payment" };
  await admin.from("orders").update({ payment_method: method, payment_status: "pending" }).eq("id", o.id);
  try {
    return { ok: true, data: { redirect: await startOnlinePayment(o.id as string, method) } };
  } catch {
    return { ok: false, error: "payment" };
  }
}

// ------------------------------------------------------------------ Wishlist, reviews, questions
export async function toggleWishlistAction(productId: string): Promise<ActionResult<{ wished: boolean }>> {
  const uid = await userId();
  if (!uid) return { ok: false, error: "login" };
  if (!uuid.safeParse(productId).success) return { ok: false, error: "invalid" };
  const supabase = await createClient();
  const { data } = await supabase.from("wishlists").select("product_id").eq("user_id", uid).eq("product_id", productId).maybeSingle();
  if (data) await supabase.from("wishlists").delete().eq("user_id", uid).eq("product_id", productId);
  else await supabase.from("wishlists").insert({ user_id: uid, product_id: productId });
  revalidatePath("/account/wishlist");
  return { ok: true, data: { wished: !data } };
}

const reviewSchema = z.object({ product_id: uuid, rating: z.number().int().min(1).max(5), title: z.string().trim().max(120).optional().default(""), body: z.string().trim().min(5).max(2000) });
export async function submitReviewAction(input: z.input<typeof reviewSchema>): Promise<ActionResult> {
  const uid = await userId();
  if (!uid) return { ok: false, error: "login" };
  const d = reviewSchema.safeParse(input);
  if (!d.success) return { ok: false, error: "invalid" };
  if (await limited(`review:${uid}`, 5, 3600)) return { ok: false, error: "rate" };
  const admin = createAdminClient();
  const { data: bought } = await admin.from("order_items").select("order_id,orders!inner(user_id,status)")
    .eq("product_id", d.data.product_id).eq("orders.user_id", uid).eq("orders.status", "delivered").limit(1);
  const { error } = await admin.from("reviews").insert({
    ...d.data, user_id: uid, is_verified: (bought?.length ?? 0) > 0, order_id: (bought?.[0]?.order_id as string) ?? null, status: "pending",
  });
  if (error) return { ok: false, error: "generic" };
  return { ok: true };
}

export async function askQuestionAction(productId: string, question: string): Promise<ActionResult> {
  const uid = await userId();
  if (!uid) return { ok: false, error: "login" };
  const q = question.trim();
  if (!uuid.safeParse(productId).success || q.length < 5 || q.length > 500) return { ok: false, error: "invalid" };
  if (await limited(`question:${uid}`, 5, 3600)) return { ok: false, error: "rate" };
  const { error } = await (await createClient()).from("product_questions").insert({ product_id: productId, user_id: uid, question: q, status: "pending" });
  return error ? { ok: false, error: "generic" } : { ok: true };
}

// ------------------------------------------------------------------ Misc
export async function productsByIdsAction(ids: string[]): Promise<ProductCardData[]> {
  const clean = ids.filter((i) => uuid.safeParse(i).success).slice(0, 12);
  if (!clean.length) return [];
  const { items } = await listProducts({ ids: clean, pageSize: 12 });
  return clean.map((id) => items.find((p) => p.id === id)).filter(Boolean) as ProductCardData[];
}

export async function searchSuggestAction(q: string) {
  const term = q.trim();
  if (term.length < 2 || (await limited("suggest", 300, 60))) return [];
  const { items } = await listProducts({ q: term, sort: "popular", pageSize: 6 });
  return items.map((p) => ({ slug: p.slug, title: p.title, price: p.price, image: p.image }));
}

const contactSchema = z.object({ data: z.record(z.string().max(3000)), turnstile: z.string().optional() });
export async function contactAction(input: z.input<typeof contactSchema>): Promise<ActionResult> {
  const d = contactSchema.safeParse(input);
  if (!d.success) return { ok: false, error: "form" };
  const { ip } = await requestMeta();
  if (await limited("contact", 5, 3600)) return { ok: false, error: "rate" };
  if (!(await verifyTurnstile(d.data.turnstile, ip))) return { ok: false, error: "captcha" };
  const admin = createAdminClient();
  // Validate against the form designed in Admin > Content > Contact form
  const cfg = ((await admin.from("settings").select("value").eq("key", "contact_form").maybeSingle()).data?.value ?? {}) as { fields?: { key: string; type: string; required?: boolean }[] };
  const fields = cfg.fields?.length ? cfg.fields : [{ key: "name", type: "text", required: true }, { key: "email", type: "email", required: true }, { key: "message", type: "textarea", required: true }];
  const data: Record<string, string> = {};
  for (const f of fields) {
    const v = String(d.data.data[f.key] ?? "").trim();
    if (f.required && !v) return { ok: false, error: "form" };
    if (f.type === "email" && v && !z.string().email().safeParse(v).success) return { ok: false, error: "form" };
    if (v) data[f.key] = v.slice(0, f.type === "textarea" ? 3000 : 300);
  }
  const email = data.email ?? "";
  const row = {
    name: data.name || "Website visitor", email: email || "no-reply@invalid", phone: data.phone ?? null, subject: data.subject ?? null,
    message: data.message || Object.entries(data).map(([k, v]) => `${k}: ${v}`).join("\n") || "(empty)", data,
  };
  await admin.from("contact_messages").insert(row);
  if (email) await admin.from("email_queue").insert({ event: "contact_autoreply", to_email: email, payload: { name: row.name } });
  return { ok: true };
}

export async function subscribeAction(email: string): Promise<ActionResult> {
  const e = z.string().trim().toLowerCase().email().safeParse(email);
  if (!e.success) return { ok: false, error: "email" };
  if (await limited("newsletter", 5, 3600)) return { ok: false, error: "rate" };
  const admin = createAdminClient();
  const token = crypto.randomUUID();
  const { error } = await admin.from("newsletter_subscribers").insert({ email: e.data, token, source: "footer" });
  if (!error) await admin.from("email_queue").insert({ event: "newsletter_confirm", to_email: e.data, payload: { token } });
  return { ok: true };
}

export async function trackOrderAction(orderNumber: string, phone: string) {
  const p = bdPhone.safeParse(phone);
  if (!p.success || !/^ORD-\d+$/i.test(orderNumber.trim())) return null;
  if (await limited("track", 20, 600)) return null;
  const { data } = await createAdminClient().from("orders")
    .select("order_number,access_token").eq("order_number", orderNumber.trim().toUpperCase()).eq("phone", p.data).maybeSingle();
  return data ? { orderNumber: data.order_number as string, token: data.access_token as string } : null;
}

const returnSchema = z.object({ orderNumber: z.string().regex(/^ORD-\d+$/), token: z.string().min(10), reason: z.string().trim().min(5).max(1000), itemIds: z.array(uuid).min(1) });
export async function requestReturnAction(input: z.input<typeof returnSchema>): Promise<ActionResult> {
  const d = returnSchema.safeParse(input);
  if (!d.success) return { ok: false, error: "form" };
  if (await limited("return", 5, 3600)) return { ok: false, error: "rate" };
  const admin = createAdminClient();
  const { data: o } = await admin.from("orders").select("id,user_id,access_token,status,delivered_at,order_items(id,title,quantity)").eq("order_number", d.data.orderNumber).maybeSingle();
  if (!o || !safeEqual(d.data.token, o.access_token as string) || o.status !== "delivered") return { ok: false, error: "generic" };
  if (o.delivered_at && Date.now() - new Date(o.delivered_at as string).getTime() > 7 * 86400_000) return { ok: false, error: "expired" };
  const { count } = await admin.from("returns").select("*", { count: "exact", head: true }).eq("order_id", o.id).neq("status", "rejected");
  if (count) return { ok: false, error: "exists" };
  const items = ((o.order_items as { id: string; title: string; quantity: number }[]) ?? []).filter((i) => d.data.itemIds.includes(i.id));
  await admin.from("returns").insert({ order_id: o.id, user_id: o.user_id, items, reason: d.data.reason });
  const store = (await admin.from("settings").select("value").eq("key", "store").single()).data?.value as { email?: string };
  if (store?.email) await admin.from("email_queue").insert({ event: "admin_return_request", to_email: store.email, payload: { order_id: o.id } });
  return { ok: true };
}

export async function stockAlertAction(productId: string, variantId: string | null, email: string): Promise<ActionResult> {
  const e = z.string().trim().toLowerCase().email().safeParse(email);
  if (!e.success || !uuid.safeParse(productId).success) return { ok: false, error: "email" };
  if (await limited("stock-alert", 10, 3600)) return { ok: false, error: "rate" };
  const admin = createAdminClient();
  let q = admin.from("stock_alerts").select("id").eq("email", e.data).eq("product_id", productId).is("notified_at", null);
  q = variantId ? q.eq("variant_id", variantId) : q.is("variant_id", null);
  const { data } = await q.maybeSingle();
  if (!data) await admin.from("stock_alerts").insert({ email: e.data, product_id: productId, variant_id: variantId });
  return { ok: true };
}

export async function trackPopupAction(id: string, kind: "view" | "click") {
  if (!uuid.safeParse(id).success || (await limited(`popup:${kind}`, 60, 600))) return;
  const admin = createAdminClient();
  const col = kind === "view" ? "views" : "clicks";
  const { data } = await admin.from("popups").select(col).eq("id", id).maybeSingle();
  if (data) await admin.from("popups").update({ [col]: Number((data as Record<string, number>)[col] ?? 0) + 1 }).eq("id", id);
}

/** Product details for the compare page. */
export async function compareProductsAction(ids: string[]) {
  const clean = ids.filter((i) => uuid.safeParse(i).success).slice(0, 4);
  if (!clean.length) return [];
  const { data } = await (await createClient()).from("products")
    .select("id,slug,title,price,compare_at_price,rating_avg,rating_count,stock,track_inventory,allow_backorder,preorder,specs,short_description,product_media(url,type,sort_order),brands(name)")
    .in("id", clean).eq("status", "published");
  return clean.map((id) => (data ?? []).find((p) => p.id === id)).filter(Boolean).map((p) => {
    const r = p as Record<string, unknown>;
    const img = ((r.product_media as { url: string; type: string; sort_order: number }[]) ?? []).filter((m) => m.type === "image").sort((a, b) => a.sort_order - b.sort_order)[0]?.url ?? null;
    return {
      id: r.id as string, slug: r.slug as string, title: r.title as string, price: Number(r.price), compareAtPrice: r.compare_at_price ? Number(r.compare_at_price) : null,
      rating: Number(r.rating_avg), ratingCount: r.rating_count as number, image: img, summary: (r.short_description as string) ?? "",
      inStock: !(r.track_inventory as boolean) || (r.allow_backorder as boolean) || (r.preorder as boolean) || (r.stock as number) > 0,
      brand: (r.brands as { name: string } | null)?.name ?? "", specs: (r.specs as { label: string; value: string }[]) ?? [],
    };
  });
}
