import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSettingValue, saveSetting } from "@/lib/settings/server";
import { stripTags } from "@/lib/security/sanitize";

/**
 * The store "brain": a compact profile of THIS store built from its own database (name, categories, price range,
 * best sellers, delivery, payments, policies, FAQ, taught answers). It goes into every chat so the assistant
 * fits whichever store this template is deployed for. Rebuilt daily and on demand.
 */
export async function buildBrain() {
  const admin = createAdminClient();
  const [store, checkout, cats, prices, best, zones, faqs, kb, pages] = await Promise.all([
    getSettingValue<{ name?: string; tagline?: string; phone?: string; email?: string; address?: string }>("store"),
    getSettingValue<{ min_order?: number; shipping_collect?: string; default_advance_percent?: number }>("checkout"),
    admin.from("categories").select("name,parent_id").eq("is_active", true).limit(60),
    admin.from("products").select("price").eq("status", "published").order("price").limit(2000),
    admin.from("products").select("title,price").eq("status", "published").order("sold_count", { ascending: false }).limit(8),
    admin.from("shipping_zones").select("name,districts,base_rate,free_over,eta_min_days,eta_max_days").eq("is_active", true),
    admin.from("faqs").select("question,answer").eq("is_active", true).limit(12),
    admin.from("chatbot_knowledge").select("title,content").eq("is_active", true).limit(40),
    admin.from("pages").select("title,content_html").in("slug", ["return-policy", "shipping-policy"]),
  ]);
  const ps = (prices.data ?? []).map((p) => Number(p.price));
  const lines = [
    `Store: ${store.name ?? "our store"}${store.tagline ? ` (${store.tagline})` : ""}. Contact: ${[store.phone, store.email].filter(Boolean).join(", ") || "via the contact page"}.`,
    `Main categories: ${(cats.data ?? []).filter((c) => !c.parent_id).map((c) => c.name).join(", ") || "various"}.`,
    ps.length ? `${ps.length} products, prices from ৳${Math.round(ps[0]!)} to ৳${Math.round(ps[ps.length - 1]!)}.` : "",
    (best.data ?? []).length ? `Best sellers: ${(best.data ?? []).map((b) => `${b.title} (৳${Math.round(Number(b.price))})`).join("; ")}.` : "",
    `Delivery: ${(zones.data ?? []).map((z) => `${z.name} ৳${z.base_rate}, ${z.eta_min_days}-${z.eta_max_days} days${z.free_over ? `, free over ৳${z.free_over}` : ""}`).join("; ")}. Cash on delivery available.`,
    checkout.shipping_collect === "prepaid" ? "Delivery charge is paid in advance online." : "",
    checkout.default_advance_percent ? `Some orders need ${checkout.default_advance_percent}% advance.` : "",
    ...(pages.data ?? []).map((p) => `${p.title}: ${stripTags(p.content_html as string).slice(0, 500)}`),
    ...(faqs.data ?? []).map((f) => `Q: ${f.question} A: ${f.answer}`),
    ...(kb.data ?? []).map((k) => `${k.title}: ${String(k.content).slice(0, 400)}`),
  ].filter(Boolean);
  const text = lines.join("\n").slice(0, 6000);
  const prev = await getSettingValue<Record<string, unknown>>("chatbot");
  await saveSetting("chatbot", { ...prev, brain: text, brain_updated_at: new Date().toISOString() });
  return text;
}

export async function getBrain() {
  const c = await getSettingValue<{ brain?: string; brain_updated_at?: string }>("chatbot");
  const stale = !c.brain_updated_at || Date.now() - new Date(c.brain_updated_at).getTime() > 86400000;
  if (!c.brain || stale) return buildBrain().catch(() => c.brain ?? "");
  return c.brain;
}
