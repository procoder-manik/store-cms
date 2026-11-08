"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertPermission } from "@/lib/auth/rbac";
import { saveSetting, getSettingValue } from "@/lib/settings/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";
import type { PermissionKey } from "@/lib/auth/permissions";
import type { ActionResult } from "@/lib/actions/result";

const KEYS: Record<string, PermissionKey> = {
  store: "settings.update", checkout: "settings.update", checkout_fields: "settings.update", referral: "settings.update", loyalty: "settings.update", invoice_design: "settings.update", post_types: "content.update", contact_form: "content.update", schema_org: "seo.update", templates: "content.update", shipping_rules: "shipping.update", invoice: "settings.update", social: "settings.update",
  "payment.sslcommerz": "payments.update", "payment.bkash": "payments.update",
  import: "imports.update", seo: "seo.update", tracking: "seo.update", "tracking.meta_capi": "seo.update", chatbot: "chatbot.update", "chatbot.ai": "chatbot.update", "import.aliexpress": "imports.update",
  "courier.steadfast": "shipping.update", "courier.pathao": "shipping.update", "courier.redx": "shipping.update",
};

export async function saveSettingsAction(key: string, pub: Record<string, unknown>, secrets?: Record<string, string>): Promise<ActionResult> {
  try {
    const perm = KEYS[key];
    if (!perm) return { ok: false, error: "Unknown setting" };
    const staff = await assertPermission(perm);
    // Flat sitemap_* switches become one nested object
    if (key === "seo") {
      const sm: Record<string, boolean> = {};
      for (const k of Object.keys(pub)) if (k.startsWith("sitemap_")) { sm[k.slice(8)] = !!pub[k]; delete pub[k]; }
      if (Object.keys(sm).length) pub.sitemap = sm;
    }
    const current = await getSettingValue<Record<string, unknown>>(key);
    const { enc: _e, ...currentPub } = current as Record<string, unknown> & { enc?: string };
    void _e;
    await saveSetting(key, { ...currentPub, ...pub }, secrets ?? (current.enc ? {} : undefined), staff.userId);
    await logAudit({ actorId: staff.userId, action: "settings.update", entity: "settings", entityId: key, after: { ...pub, secrets: Object.keys(secrets ?? {}).filter((k) => secrets![k]) } });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

const zoneSchema = z.object({
  id: z.string().uuid().optional(), name: z.string().trim().min(2).max(60), districts: z.array(z.string()).max(64),
  base_rate: z.number().min(0), per_kg_rate: z.number().min(0), free_over: z.number().min(0).nullable(),
  eta_min_days: z.number().int().min(0).max(30), eta_max_days: z.number().int().min(0).max(60), sort_order: z.number().int(), is_active: z.boolean(),
});
export async function saveZoneAction(input: z.infer<typeof zoneSchema>): Promise<ActionResult> {
  try {
    const staff = await assertPermission("shipping.update");
    const d = zoneSchema.parse(input);
    const admin = createAdminClient();
    const { id, ...row } = d;
    const { error } = id ? await admin.from("shipping_zones").update(row).eq("id", id) : await admin.from("shipping_zones").insert(row);
    if (error) return { ok: false, error: error.message };
    await logAudit({ actorId: staff.userId, action: "shipping.zone", entity: "shipping_zones", entityId: id ?? null, after: row });
    revalidatePath("/admin/shipping");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function deleteZoneAction(id: string): Promise<ActionResult> {
  try {
    const staff = await assertPermission("shipping.delete");
    await createAdminClient().from("shipping_zones").delete().eq("id", id);
    await logAudit({ actorId: staff.userId, action: "shipping.zone_delete", entity: "shipping_zones", entityId: id });
    revalidatePath("/admin/shipping");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed" };
  }
}
