"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertPermission } from "@/lib/auth/rbac";
import { logAudit } from "@/lib/audit";
import type { ActionResult } from "@/lib/actions/result";

export async function updateCustomerAction(id: string, patch: { is_blocked?: boolean; admin_note?: string; points_delta?: number; points_reason?: string }): Promise<ActionResult> {
  try {
    const staff = await assertPermission("customers.update");
    z.string().uuid().parse(id);
    const admin = createAdminClient();
    const { data: p } = await admin.from("profiles").select("is_staff,loyalty_points").eq("id", id).single();
    if (!p || p.is_staff) return { ok: false, error: "Use Staff to manage team accounts." };
    const update: Record<string, unknown> = {};
    if (patch.is_blocked !== undefined) {
      update.is_blocked = patch.is_blocked;
      await admin.auth.admin.updateUserById(id, { ban_duration: patch.is_blocked ? "876000h" : "none" });
    }
    if (patch.admin_note !== undefined) update.admin_note = patch.admin_note.slice(0, 2000);
    if (patch.points_delta) {
      update.loyalty_points = Math.max(0, (p.loyalty_points as number) + Math.round(patch.points_delta));
      await admin.from("loyalty_transactions").insert({ user_id: id, points: Math.round(patch.points_delta), reason: patch.points_reason || "Manual adjustment" });
    }
    await admin.from("profiles").update(update).eq("id", id);
    await logAudit({ actorId: staff.userId, action: "customer.update", entity: "profiles", entityId: id, after: patch });
    revalidatePath(`/admin/customers/${id}`);
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : "Failed" }; }
}
