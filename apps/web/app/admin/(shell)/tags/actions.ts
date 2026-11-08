"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertPermission } from "@/lib/auth/rbac";
import { slugify } from "@/lib/utils";
import type { ActionResult } from "@/lib/actions/result";

export async function renameTagAction(id: string, name: string): Promise<ActionResult> {
  try {
    await assertPermission("products.update");
    const n = z.string().trim().min(1).max(40).parse(name);
    const { error } = await createAdminClient().from("tags").update({ name: n, slug: slugify(n) }).eq("id", id);
    if (error) return { ok: false, error: error.code === "23505" ? "A tag with that name already exists. Delete or merge instead." : error.message };
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : "Failed" }; }
}

export async function deleteTagAction(id: string): Promise<ActionResult> {
  try {
    await assertPermission("products.delete");
    await createAdminClient().from("tags").delete().eq("id", id);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : "Failed" }; }
}

/** Moves all products from one tag to another, then removes the first tag. */
export async function mergeTagsAction(fromId: string, toId: string): Promise<ActionResult> {
  try {
    await assertPermission("products.update");
    if (fromId === toId) return { ok: false, error: "Pick two different tags." };
    const admin = createAdminClient();
    const { data } = await admin.from("product_tags").select("product_id").eq("tag_id", fromId);
    if (data?.length) await admin.from("product_tags").upsert(data.map((r) => ({ product_id: r.product_id, tag_id: toId })), { onConflict: "product_id,tag_id" });
    await admin.from("tags").delete().eq("id", fromId);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : "Failed" }; }
}
