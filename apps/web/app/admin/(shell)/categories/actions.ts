"use server";
import { redirectOnSlugChange } from "@/lib/seo/slug-redirect";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertPermission } from "@/lib/auth/rbac";
import { logAudit } from "@/lib/audit";
import { slugify } from "@/lib/utils";
import { seoSchema } from "@/lib/validators/seo";
import type { ActionResult } from "@/lib/actions/result";

const schema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, "Enter a name.").max(80),
  name_bn: z.string().trim().max(80).optional().default(""),
  slug: z.string().trim().max(120).optional().default(""),
  parent_id: z.string().uuid().nullable().optional(),
  description: z.string().trim().max(2000).optional().default(""),
  image_url: z.string().url().or(z.literal("")).optional().default(""),
  icon: z.string().trim().max(40).optional().default(""),
  sort_order: z.coerce.number().int().default(0),
  is_active: z.boolean().default(true),
  seo: seoSchema.default({}),
});
export type CategoryInput = z.input<typeof schema>;

export async function saveCategoryAction(input: CategoryInput): Promise<ActionResult<{ id: string }>> {
  try {
    const d = schema.parse(input);
    const staff = await assertPermission(d.id ? "categories.update" : "categories.create");
    if (d.id && d.parent_id === d.id) return { ok: false, error: "A category cannot be its own parent." };
    const row = {
      name: d.name, name_bn: d.name_bn || null, slug: slugify(d.slug || d.name), parent_id: d.parent_id || null,
      description: d.description || null, image_url: d.image_url || null, icon: d.icon || null,
      sort_order: d.sort_order, is_active: d.is_active, seo: d.seo,
    };
    const admin = createAdminClient();
    const oldSlug = d.id ? ((await admin.from("categories").select("slug").eq("id", d.id).maybeSingle()).data?.slug as string | undefined) : undefined;
    const q = d.id ? admin.from("categories").update(row).eq("id", d.id) : admin.from("categories").insert(row);
    const { data, error } = await q.select("id").single();
    if (error) return { ok: false, error: error.code === "23505" ? "That URL slug is already used." : error.message };
    await redirectOnSlugChange(admin, "/category", oldSlug, row.slug);
    await logAudit({ actorId: staff.userId, action: d.id ? "category.update" : "category.create", entity: "categories", entityId: data.id as string, after: row });
    revalidatePath("/admin/categories");
    revalidatePath("/", "layout");
    return { ok: true, data: { id: data.id as string } };
  } catch (e) {
    return { ok: false, error: e instanceof z.ZodError ? e.issues[0]?.message ?? "Invalid" : e instanceof Error ? e.message : "Failed" };
  }
}

export async function deleteCategoryAction(id: string): Promise<ActionResult> {
  try {
    const staff = await assertPermission("categories.delete");
    const admin = createAdminClient();
    const { count } = await admin.from("categories").select("*", { count: "exact", head: true }).eq("parent_id", id);
    if (count) return { ok: false, error: "Move or delete its sub-categories first." };
    const { data: before } = await admin.from("categories").select("*").eq("id", id).single();
    await admin.from("categories").delete().eq("id", id);
    await logAudit({ actorId: staff.userId, action: "category.delete", entity: "categories", entityId: id, before });
    revalidatePath("/admin/categories");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed" };
  }
}
