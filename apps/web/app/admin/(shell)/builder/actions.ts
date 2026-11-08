"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertPermission } from "@/lib/auth/rbac";
import { logAudit } from "@/lib/audit";
import { SECTIONS, type SectionRow } from "@/lib/sections/registry";
import type { ActionResult } from "@/lib/actions/result";

const types = new Set([...SECTIONS.map((s) => s.type), "perks"]);
const rowSchema = z.object({
  id: z.string().max(60), type: z.string().refine((t) => types.has(t)), title: z.string().max(160).nullable(),
  config: z.record(z.unknown()).refine((c) => JSON.stringify(c).length < 60_000, "Section is too large"), is_active: z.boolean(),
});

export async function saveSectionsAction(target: string, rows: SectionRow[]): Promise<ActionResult> {
  try {
    const staff = await assertPermission("content.update");
    const list = z.array(rowSchema).max(40).parse(rows);
    const admin = createAdminClient();
    if (target === "home") {
      await admin.from("home_sections").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (list.length) {
        const { error } = await admin.from("home_sections").insert(list.map((r, i) => ({ type: r.type, title: r.title || null, config: r.config, is_active: r.is_active, sort_order: i + 1 })));
        if (error) return { ok: false, error: error.message };
      }
    } else {
      const id = z.string().uuid().parse(target);
      const { error } = await admin.from("pages").update({ sections: list }).eq("id", id);
      if (error) return { ok: false, error: error.message };
    }
    await logAudit({ actorId: staff.userId, action: "builder.save", entity: target === "home" ? "home_sections" : "pages", entityId: target, after: { count: list.length } });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof z.ZodError ? e.issues[0]?.message ?? "Invalid section" : e instanceof Error ? e.message : "Failed" }; }
}

export async function builderProductSearchAction(q: string) {
  await assertPermission("content.view");
  const term = q.replace(/[%,()]/g, " ").trim();
  const admin = createAdminClient();
  const query = admin.from("products").select("id,title,price,product_media(url,sort_order)").eq("status", "published").limit(12);
  const { data } = term.length > 1 ? await query.ilike("title", `%${term}%`) : await query.order("published_at", { ascending: false });
  return (data ?? []).map((p) => ({
    id: p.id as string, title: p.title as string, price: Number(p.price),
    image: ((p.product_media as { url: string; sort_order: number }[]) ?? []).sort((a, b) => a.sort_order - b.sort_order)[0]?.url ?? null,
  }));
}

export async function builderProductsByIdsAction(ids: string[]) {
  await assertPermission("content.view");
  if (!ids.length) return [];
  const { data } = await createAdminClient().from("products").select("id,title").in("id", ids.slice(0, 40));
  return (data ?? []) as { id: string; title: string }[];
}
