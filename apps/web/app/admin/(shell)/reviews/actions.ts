"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertPermission } from "@/lib/auth/rbac";
import { logAudit } from "@/lib/audit";
import type { ActionResult } from "@/lib/actions/result";

const schema = z.object({ kind: z.enum(["review", "question"]), id: z.string().uuid(), status: z.enum(["approved", "rejected", "pending"]), reply: z.string().max(2000).optional() });

export async function moderateAction(input: z.infer<typeof schema>): Promise<ActionResult> {
  try {
    const staff = await assertPermission("reviews.update");
    const d = schema.parse(input);
    const admin = createAdminClient();
    if (d.kind === "review") await admin.from("reviews").update({ status: d.status, ...(d.reply !== undefined && { admin_reply: d.reply || null }) }).eq("id", d.id);
    else await admin.from("product_questions").update({ status: d.status, ...(d.reply !== undefined && { answer: d.reply || null }) }).eq("id", d.id);
    await logAudit({ actorId: staff.userId, action: `${d.kind}.${d.status}`, entity: d.kind === "review" ? "reviews" : "product_questions", entityId: d.id });
    revalidatePath("/admin/reviews");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : "Failed" }; }
}
