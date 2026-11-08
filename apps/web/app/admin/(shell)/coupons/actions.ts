"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertPermission } from "@/lib/auth/rbac";
import { logAudit } from "@/lib/audit";
import type { ActionResult } from "@/lib/actions/result";

const opt = z.union([z.number(), z.null()]);
const schema = z.object({
  id: z.string().uuid().optional(),
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,30}$/, "Use 3 to 30 letters, numbers, - or _."),
  description: z.string().max(200).default(""),
  type: z.enum(["percentage", "fixed", "free_shipping"]),
  value: z.number().min(0),
  min_order: z.number().min(0).default(0),
  max_discount: opt, usage_limit: opt, per_user_limit: opt,
  starts_at: z.string().nullable(), ends_at: z.string().nullable(),
  product_ids: z.array(z.string().uuid()).default([]), category_ids: z.array(z.string().uuid()).default([]),
  first_order_only: z.boolean(), is_public: z.boolean(), is_active: z.boolean(),
});
export type CouponInput = z.input<typeof schema>;

export async function saveCouponAction(input: CouponInput): Promise<ActionResult> {
  try {
    const parsed = schema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form" };
    const d = parsed.data;
    if (d.type === "percentage" && (d.value <= 0 || d.value > 100)) return { ok: false, error: "Percentage must be between 1 and 100." };
    const staff = await assertPermission(d.id ? "coupons.update" : "coupons.create");
    const row = {
      code: d.code, description: d.description || null, type: d.type, value: d.type === "free_shipping" ? 0 : d.value, min_order: d.min_order,
      max_discount: d.max_discount, usage_limit: d.usage_limit, per_user_limit: d.per_user_limit,
      starts_at: d.starts_at ? new Date(d.starts_at).toISOString() : null, ends_at: d.ends_at ? new Date(d.ends_at).toISOString() : null,
      applies_to: { product_ids: d.product_ids, category_ids: d.category_ids }, first_order_only: d.first_order_only, is_public: d.is_public, is_active: d.is_active,
    };
    const admin = createAdminClient();
    const { error } = d.id ? await admin.from("coupons").update(row).eq("id", d.id) : await admin.from("coupons").insert(row);
    if (error) return { ok: false, error: error.code === "23505" ? "That code already exists." : error.message };
    await logAudit({ actorId: staff.userId, action: d.id ? "coupon.update" : "coupon.create", entity: "coupons", entityId: d.id ?? d.code, after: row });
    revalidatePath("/admin/coupons");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : "Failed" }; }
}

export async function deleteCouponAction(id: string): Promise<ActionResult> {
  try {
    const staff = await assertPermission("coupons.delete");
    const admin = createAdminClient();
    const { count } = await admin.from("coupon_redemptions").select("*", { count: "exact", head: true }).eq("coupon_id", id);
    if (count) await admin.from("coupons").update({ is_active: false }).eq("id", id);
    else await admin.from("coupons").delete().eq("id", id);
    await logAudit({ actorId: staff.userId, action: "coupon.delete", entity: "coupons", entityId: id });
    revalidatePath("/admin/coupons");
    return { ok: true, message: count ? "This code was used, so it was turned off instead of deleted." : undefined };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : "Failed" }; }
}
