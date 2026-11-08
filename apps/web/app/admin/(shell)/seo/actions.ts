"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertPermission } from "@/lib/auth/rbac";
import { logAudit } from "@/lib/audit";
import type { ActionResult } from "@/lib/actions/result";

const schema = z.object({
  from_path: z.string().trim().regex(/^\/[^\s?#]*$/, "From must start with / and have no spaces").max(300),
  to_path: z.string().trim().min(1).max(500).refine((v) => v.startsWith("/") || /^https?:\/\//.test(v), "To must start with / or https://"),
  code: z.union([z.literal(301), z.literal(302)]),
});

export async function saveRedirectAction(input: z.infer<typeof schema>): Promise<ActionResult> {
  try {
    const staff = await assertPermission("seo.update");
    const d = schema.parse(input);
    const from = d.from_path.replace(/\/$/, "") || "/";
    if (from === d.to_path) return { ok: false, error: "From and To are the same." };
    const admin = createAdminClient();
    const { error } = await admin.from("redirects").upsert({ from_path: from, to_path: d.to_path, code: d.code }, { onConflict: "from_path" });
    if (error) return { ok: false, error: error.message };
    await admin.from("not_found_logs").delete().eq("path", from);
    await logAudit({ actorId: staff.userId, action: "seo.redirect", entity: "redirects", entityId: from, after: d });
    revalidatePath("/admin/seo");
    return { ok: true, message: "Saved. It takes up to a minute to go live." };
  } catch (e) { return { ok: false, error: e instanceof z.ZodError ? e.issues[0]?.message ?? "Invalid" : e instanceof Error ? e.message : "Failed" }; }
}

export async function deleteRedirectAction(id: string): Promise<ActionResult> {
  try {
    const staff = await assertPermission("seo.delete");
    await createAdminClient().from("redirects").delete().eq("id", id);
    await logAudit({ actorId: staff.userId, action: "seo.redirect_delete", entity: "redirects", entityId: id });
    revalidatePath("/admin/seo");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : "Failed" }; }
}

export async function clearNotFoundAction(path?: string): Promise<ActionResult> {
  try {
    await assertPermission("seo.update");
    const q = createAdminClient().from("not_found_logs").delete();
    await (path ? q.eq("path", path) : q.neq("path", ""));
    revalidatePath("/admin/seo");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : "Failed" }; }
}
