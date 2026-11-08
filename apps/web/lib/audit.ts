import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { requestMeta } from "@/lib/security/request";

/** Records an admin action. Never throws: auditing must not break the action itself. */
export async function logAudit(input: {
  actorId: string;
  action: string;
  entity: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
}) {
  try {
    const { ip, userAgent } = await requestMeta();
    await createAdminClient().from("audit_logs").insert({
      actor_id: input.actorId,
      action: input.action,
      entity: input.entity,
      entity_id: input.entityId ?? null,
      before: input.before ?? null,
      after: input.after ?? null,
      ip,
      user_agent: userAgent,
    });
  } catch (e) {
    console.error("audit log failed", e);
  }
}
