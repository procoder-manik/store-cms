"use server";
import { redirectOnSlugChange } from "@/lib/seo/slug-redirect";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertPermission } from "@/lib/auth/rbac";
import { logAudit } from "@/lib/audit";
import { sanitizeRich } from "@/lib/security/sanitize";
import { slugify } from "@/lib/utils";
import { productSchema, type ProductInput } from "@/lib/validators/product";
import type { ActionResult } from "@/lib/actions/result";

/** Validates, sanitises and saves a product atomically through save_product(). */
export async function saveProductAction(input: ProductInput): Promise<ActionResult<{ id: string; slug: string }>> {
  try {
    const parsed = productSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
    const d = parsed.data;
    const staff = await assertPermission(d.id ? "products.update" : "products.create");

    const slug = slugify(d.slug || d.title) || `product-${Date.now()}`;
    if (d.status === "scheduled" && !d.published_at) return { ok: false, error: "Pick a publish date for a scheduled product." };
    const payload = {
      ...d,
      slug,
      description_html: sanitizeRich(d.description_html),
      size_guide_html: sanitizeRich(d.size_guide_html),
      published_at: d.status === "scheduled" ? new Date(d.published_at).toISOString() : d.status === "published" ? d.published_at || null : null,
      specs: d.specs.filter((s) => s.label && s.value),
      status: d.status === "scheduled" ? "published" : d.status,
    };

    const supabase = await createClient();
    const { data: before } = d.id ? await supabase.from("products").select("title,price,status,stock,slug").eq("id", d.id).single() : { data: null };
    const { data: id, error } = await supabase.rpc("save_product", { p: payload });
    if (error) {
      if (error.code === "23505") return { ok: false, error: error.message.includes("sku") ? "That SKU is already used." : "That URL slug is already used. Change it." };
      return { ok: false, error: error.message === "forbidden" ? "You do not have permission." : error.message };
    }
    // Payment rules live outside save_product so older databases keep working
    await createAdminClient().from("products").update({ shipping_mode: d.shipping_mode, advance_percent: d.advance_percent, advance_optional: d.advance_optional, preorder: d.preorder, preorder_ships_at: d.preorder_ships_at || null, preorder_note: d.preorder_note || null, badges: d.badges }).eq("id", id as string);
    if (before?.slug) await redirectOnSlugChange(createAdminClient(), "/product", before.slug as string, slug);
    await logAudit({ actorId: staff.userId, action: d.id ? "product.update" : "product.create", entity: "products", entityId: id as string, before, after: { title: d.title, price: d.price, status: payload.status } });
    revalidatePath("/admin/products");
    revalidatePath("/", "layout");
    return { ok: true, data: { id: id as string, slug } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to save." };
  }
}

export async function bulkProductsAction(ids: string[], op: "publish" | "draft" | "archive" | "delete"): Promise<ActionResult> {
  try {
    const list = z.array(z.string().uuid()).min(1).max(200).parse(ids);
    const staff = await assertPermission(op === "delete" ? "products.delete" : "products.update");
    const admin = createAdminClient();
    if (op === "delete") {
      const { count } = await admin.from("order_items").select("*", { count: "exact", head: true }).in("product_id", list);
      if (count) {
        await admin.from("products").update({ status: "archived" }).in("id", list);
        await logAudit({ actorId: staff.userId, action: "product.archive_bulk", entity: "products", after: { ids: list } });
        revalidatePath("/admin/products");
        return { ok: true, message: "Some products have orders, so they were archived instead of deleted." };
      }
      await admin.from("products").delete().in("id", list);
    } else {
      const status = op === "publish" ? "published" : op === "draft" ? "draft" : "archived";
      await admin.from("products").update({ status }).in("id", list);
    }
    await logAudit({ actorId: staff.userId, action: `product.${op}_bulk`, entity: "products", after: { ids: list } });
    revalidatePath("/admin/products");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function duplicateProductAction(id: string): Promise<ActionResult<{ id: string }>> {
  try {
    await assertPermission("products.create");
    const input = await loadProductForEdit(id);
    if (!input) return { ok: false, error: "Not found" };
    const copy: ProductInput = {
      ...input, id: undefined, title: `${input.title} (copy)`, slug: `${input.slug}-copy-${Date.now().toString(36)}`,
      sku: "", status: "draft", variants: input.variants?.map((v) => ({ ...v, id: undefined, sku: "" })),
    };
    const r = await saveProductAction(copy);
    return r.ok ? { ok: true, data: { id: r.data!.id } } : r;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

/** Loads a product with all relations into the editor's shape. */
export async function loadProductForEdit(id: string): Promise<ProductInput | null> {
  await assertPermission("products.view");
  const { data: p } = await createAdminClient()
    .from("products")
    .select("*, product_categories(category_id), product_media(*), product_options(id,name,sort_order,product_option_values(value,swatch_hex,image_url,sort_order)), product_variants(*), product_tags(tags(name))")
    .eq("id", id).single();
  if (!p) return null;
  type Opt = { name: string; sort_order: number; product_option_values: { value: string; swatch_hex: string | null; image_url: string | null; sort_order: number }[] };
  const r = p as Record<string, unknown>;
  return {
    id: r.id as string, title: r.title as string, title_bn: (r.title_bn as string) ?? "", slug: r.slug as string,
    short_description: (r.short_description as string) ?? "", description_html: (r.description_html as string) ?? "",
    status: r.status as "draft", published_at: (r.published_at as string) ?? "",
    price: Number(r.price), compare_at_price: r.compare_at_price == null ? null : Number(r.compare_at_price),
    cost_price: r.cost_price == null ? null : Number(r.cost_price), sku: (r.sku as string) ?? "", barcode: (r.barcode as string) ?? "",
    stock: r.stock as number, track_inventory: r.track_inventory as boolean, allow_backorder: r.allow_backorder as boolean,
    low_stock_threshold: r.low_stock_threshold as number, weight_grams: (r.weight_grams as number | null) ?? "",
    is_featured: r.is_featured as boolean,
    category_ids: ((r.product_categories as { category_id: string }[]) ?? []).map((c) => c.category_id),
    brand_id: (r.brand_id as string) ?? null,
    tags: ((r.product_tags as unknown as { tags: { name: string } | null }[]) ?? []).map((t) => t.tags?.name ?? "").filter(Boolean),
    specs: (r.specs as { label: string; value: string }[]) ?? [],
    size_guide_html: (r.size_guide_html as string) ?? "",
    media: ((r.product_media as { type: "image" | "video"; url: string; thumbnail_url: string | null; alt: string | null; option_value: string | null; sort_order: number }[]) ?? [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((m) => ({ type: m.type, url: m.url, thumbnail_url: m.thumbnail_url, alt: m.alt ?? "", option_value: m.option_value ?? "" })),
    options: ((r.product_options as Opt[]) ?? []).sort((a, b) => a.sort_order - b.sort_order).map((o) => ({
      name: o.name,
      values: o.product_option_values.sort((a, b) => a.sort_order - b.sort_order).map((v) => ({ value: v.value, swatch_hex: v.swatch_hex ?? "", image_url: v.image_url ?? "" })),
    })),
    variants: ((r.product_variants as Record<string, unknown>[]) ?? []).map((v) => ({
      id: v.id as string, option_values: v.option_values as Record<string, string>, sku: (v.sku as string) ?? "",
      price: Number(v.price), compare_at_price: v.compare_at_price == null ? null : Number(v.compare_at_price),
      cost_price: v.cost_price == null ? null : Number(v.cost_price), stock: v.stock as number,
      image_url: (v.image_url as string) ?? "", is_active: v.is_active as boolean,
    })),
    seo: (r.seo as Record<string, string>) ?? {},
    source_platform: r.source_platform as "manual",
    shipping_mode: ((r.shipping_mode as string) ?? "default") as "default", advance_percent: (r.advance_percent as number | null) == null ? null : Number(r.advance_percent),
    advance_optional: r.advance_optional !== false,
    preorder: !!r.preorder, preorder_ships_at: (r.preorder_ships_at as string) ?? "", preorder_note: (r.preorder_note as string) ?? "", badges: ((r.badges as string[]) ?? []) as never,
    source_url: (r.source_url as string) ?? "", source_id: (r.source_id as string) ?? "",
  };
}
