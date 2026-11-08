"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertPermission } from "@/lib/auth/rbac";
import { logAudit } from "@/lib/audit";
import type { ActionResult } from "@/lib/actions/result";

const schema = z.object({
  entity: z.enum(["global", "home", "page", "landing", "post", "product", "category"]),
  id: z.string().min(1).max(80),
  head: z.string().max(100_000).default(""), body_start: z.string().max(100_000).default(""), footer: z.string().max(100_000).default(""),
});

/** Saves custom code. Needs the "code" permission because pasted scripts run for every visitor. */
export async function saveCodeAction(input: z.input<typeof schema>): Promise<ActionResult> {
  try {
    const staff = await assertPermission("code.update");
    const d = schema.parse(input);
    const admin = createAdminClient();
    const empty = !d.head.trim() && !d.body_start.trim() && !d.footer.trim();
    const { error } = empty
      ? await admin.from("custom_code").delete().eq("entity", d.entity).eq("entity_id", d.id)
      : await admin.from("custom_code").upsert({ entity: d.entity, entity_id: d.id, head: d.head, body_start: d.body_start, footer: d.footer, updated_at: new Date().toISOString(), updated_by: staff.userId });
    if (error) return { ok: false, error: error.message };
    await logAudit({ actorId: staff.userId, action: "code.save", entity: "custom_code", entityId: `${d.entity}:${d.id}`, after: { head: d.head.length, body_start: d.body_start.length, footer: d.footer.length } });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof z.ZodError ? e.issues[0]?.message ?? "Invalid" : e instanceof Error ? e.message : "Failed" }; }
}
