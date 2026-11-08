"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertPermission } from "@/lib/auth/rbac";
import { slugify } from "@/lib/utils";
import type { ActionResult } from "@/lib/actions/result";

const brand = z.object({ id: z.string().uuid().optional(), name: z.string().trim().min(1).max(80), slug: z.string().max(80).default(""), logo_url: z.string().url().or(z.literal("")).default(""), is_active: z.boolean().default(true) });

export async function saveBrandAction(input: z.input<typeof brand>): Promise<ActionResult> {
  try {
    const d = brand.parse(input);
    await assertPermission(d.id ? "products.update" : "products.create");
    const row = { name: d.name, slug: slugify(d.slug || d.name), logo_url: d.logo_url || null, is_active: d.is_active };
    const admin = createAdminClient();
    const { error } = d.id ? await admin.from("brands").update(row).eq("id", d.id) : await admin.from("brands").insert(row);
    if (error) return { ok: false, error: error.code === "23505" ? "That name or address is already used." : error.message };
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof z.ZodError ? e.issues[0]?.message ?? "Invalid" : e instanceof Error ? e.message : "Failed" }; }
}

export async function deleteBrandAction(id: string): Promise<ActionResult> {
  try {
    await assertPermission("products.delete");
    await createAdminClient().from("brands").delete().eq("id", id);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : "Failed" }; }
}
