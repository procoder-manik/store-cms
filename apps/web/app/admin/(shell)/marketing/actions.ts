"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertPermission } from "@/lib/auth/rbac";
import { logAudit } from "@/lib/audit";
import type { ActionResult } from "@/lib/actions/result";

const fail = (e: unknown): ActionResult<never> => ({ ok: false, error: e instanceof z.ZodError ? e.issues[0]?.message ?? "Invalid" : e instanceof Error ? e.message : "Failed" });
const iso = (v: string | null | undefined) => (v ? new Date(v).toISOString() : null);
const TABLES = ["banners", "popups", "flash_sales", "home_sections"] as const;

async function done(staffId: string, action: string, table: string, id?: string | null) {
  await logAudit({ actorId: staffId, action, entity: table, entityId: id ?? null });
  revalidatePath("/admin/marketing");
  revalidatePath("/", "layout");
}

const bannerSchema = z.object({
  id: z.string().uuid().optional(), placement: z.enum(["hero", "announcement", "home_mid"]), title: z.string().max(120).default(""), subtitle: z.string().max(240).default(""),
  image_url: z.string().url().or(z.literal("")).default(""), mobile_image_url: z.string().url().or(z.literal("")).default(""), link_url: z.string().max(300).default(""),
  sort_order: z.number().int().default(0), starts_at: z.string().nullable().default(null), ends_at: z.string().nullable().default(null), is_active: z.boolean().default(true),
});
export async function saveBannerAction(input: z.input<typeof bannerSchema>): Promise<ActionResult> {
  try {
    const staff = await assertPermission("marketing.update");
    const { id, ...d } = bannerSchema.parse(input);
    if (d.placement !== "announcement" && !d.image_url) return { ok: false, error: "Choose an image." };
    const row = { ...d, title: d.title || null, subtitle: d.subtitle || null, image_url: d.image_url || null, mobile_image_url: d.mobile_image_url || null, link_url: d.link_url || null, starts_at: iso(d.starts_at), ends_at: iso(d.ends_at) };
    const admin = createAdminClient();
    const { error } = id ? await admin.from("banners").update(row).eq("id", id) : await admin.from("banners").insert(row);
    if (error) return { ok: false, error: error.message };
    await done(staff.userId, "banner.save", "banners", id);
    return { ok: true };
  } catch (e) { return fail(e); }
}

const popupSchema = z.object({
  id: z.string().uuid().optional(), title: z.string().trim().min(2).max(120), body: z.string().max(500).default(""), image_url: z.string().url().or(z.literal("")).default(""),
  cta_label: z.string().max(40).default(""), cta_url: z.string().max(300).default(""), coupon_id: z.string().uuid().nullable().default(null),
  trigger_type: z.enum(["delay", "exit", "scroll", "entry"]), trigger_value: z.number().min(0).max(600).default(5),
  pages: z.string().max(300).default("*"), devices: z.enum(["all", "mobile", "desktop"]).default("all"),
  frequency: z.enum(["once_per_session", "once_per_day", "once_ever", "every_visit"]).default("once_per_session"),
  starts_at: z.string().nullable().default(null), ends_at: z.string().nullable().default(null), is_active: z.boolean().default(false),
});
export async function savePopupAction(input: z.input<typeof popupSchema>): Promise<ActionResult> {
  try {
    const staff = await assertPermission("marketing.update");
    const { id, trigger_type, trigger_value, pages, devices, ...d } = popupSchema.parse(input);
    const row = {
      ...d, body: d.body || null, image_url: d.image_url || null, cta_label: d.cta_label || null, cta_url: d.cta_url || null,
      trigger: { type: trigger_type, value: trigger_value }, targeting: { pages: pages.split(",").map((p) => p.trim()).filter(Boolean), devices: [devices] },
      starts_at: iso(d.starts_at), ends_at: iso(d.ends_at),
    };
    const admin = createAdminClient();
    const { error } = id ? await admin.from("popups").update(row).eq("id", id) : await admin.from("popups").insert(row);
    if (error) return { ok: false, error: error.message };
    await done(staff.userId, "popup.save", "popups", id);
    return { ok: true };
  } catch (e) { return fail(e); }
}

const saleSchema = z.object({
  id: z.string().uuid().optional(), title: z.string().trim().min(2).max(80), starts_at: z.string(), ends_at: z.string(), is_active: z.boolean(),
  items: z.array(z.object({ product_id: z.string().uuid(), sale_price: z.number().positive(), quantity_limit: z.number().int().positive().nullable() })).max(100),
});
export async function saveFlashSaleAction(input: z.input<typeof saleSchema>): Promise<ActionResult> {
  try {
    const staff = await assertPermission("marketing.update");
    const d = saleSchema.parse(input);
    if (new Date(d.ends_at) <= new Date(d.starts_at)) return { ok: false, error: "End time must be after start time." };
    const admin = createAdminClient();
    const row = { title: d.title, starts_at: iso(d.starts_at), ends_at: iso(d.ends_at), is_active: d.is_active };
    let id = d.id;
    if (id) await admin.from("flash_sales").update(row).eq("id", id);
    else id = ((await admin.from("flash_sales").insert(row).select("id").single()).data?.id as string);
    const { data: old } = await admin.from("flash_sale_items").select("product_id,sold").eq("flash_sale_id", id);
    await admin.from("flash_sale_items").delete().eq("flash_sale_id", id);
    if (d.items.length) {
      await admin.from("flash_sale_items").insert(d.items.map((i) => ({ ...i, flash_sale_id: id, sold: old?.find((o) => o.product_id === i.product_id)?.sold ?? 0 })));
    }
    await done(staff.userId, "flash_sale.save", "flash_sales", id);
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function saveHomeSectionsAction(rows: { id: string; title: string | null; is_active: boolean; sort_order: number; config: Record<string, unknown> }[]): Promise<ActionResult> {
  try {
    const staff = await assertPermission("content.update");
    const admin = createAdminClient();
    for (const r of rows.slice(0, 30)) {
      await admin.from("home_sections").update({ title: r.title || null, is_active: r.is_active, sort_order: r.sort_order, config: r.config }).eq("id", z.string().uuid().parse(r.id));
    }
    await done(staff.userId, "home.sections", "home_sections");
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function addHomeSectionAction(type: string): Promise<ActionResult> {
  try {
    const staff = await assertPermission("content.update");
    if (!["hero", "perks", "categories", "flash_sale", "products", "newsletter"].includes(type)) return { ok: false, error: "Unknown section" };
    await createAdminClient().from("home_sections").insert({ type, sort_order: 99, config: type === "products" ? { source: "featured", limit: 8 } : {} });
    await done(staff.userId, "home.section_add", "home_sections");
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function deleteMarketingAction(table: (typeof TABLES)[number], id: string): Promise<ActionResult> {
  try {
    if (!TABLES.includes(table)) return { ok: false, error: "Invalid" };
    const staff = await assertPermission(table === "home_sections" ? "content.delete" : "marketing.delete");
    await createAdminClient().from(table).delete().eq("id", z.string().uuid().parse(id));
    await done(staff.userId, `${table}.delete`, table, id);
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function searchProductsAction(q: string) {
  await assertPermission("marketing.view");
  const term = q.replace(/[%,()]/g, " ").trim();
  if (term.length < 2) return [];
  const { data } = await createAdminClient().from("products").select("id,title,price").eq("status", "published").ilike("title", `%${term}%`).limit(10);
  return (data ?? []).map((p) => ({ id: p.id as string, title: p.title as string, price: Number(p.price) }));
}
