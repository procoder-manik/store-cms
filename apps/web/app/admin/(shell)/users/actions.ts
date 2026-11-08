"use server";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { processEmailQueue } from "@/lib/email/worker";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertPermission } from "@/lib/auth/rbac";
import { logAudit } from "@/lib/audit";
import { MODULES, ACTIONS } from "@/lib/auth/permissions";
import type { ActionResult } from "@/lib/actions/result";

const site = () => process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

async function isSuperAdminRole(roleId: string) {
  const { data } = await createAdminClient().from("roles").select("name").eq("id", roleId).single();
  return data?.name === "Super Admin";
}

async function wrap<T>(fn: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    return await fn();
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
  name: z.string().trim().min(2, "Enter a name.").max(80),
  role_id: z.string().uuid("Choose a role."),
});

/** Creates (or promotes) a staff account and returns a one-time sign-in link to share. */
export async function inviteStaffAction(input: z.infer<typeof inviteSchema>): Promise<ActionResult<{ link: string }>> {
  return wrap(async () => {
    const staff = await assertPermission("users.create");
    const data = inviteSchema.parse(input);
    if ((await isSuperAdminRole(data.role_id)) && !staff.permissions.has("*")) {
      return { ok: false, error: "Only a Super Admin can invite another Super Admin." };
    }
    const admin = createAdminClient();

    let userId: string;
    let link: string;
    const invite = await admin.auth.admin.generateLink({ type: "invite", email: data.email, options: { data: { full_name: data.name } } });
    if (!invite.error && invite.data.user) {
      userId = invite.data.user.id;
      link = `${site()}/api/auth/confirm?token_hash=${invite.data.properties.hashed_token}&type=invite&next=/admin/set-password`;
    } else {
      // Already registered (for example an existing customer): promote and send a magic link.
      const magic = await admin.auth.admin.generateLink({ type: "magiclink", email: data.email });
      if (magic.error || !magic.data.user) return { ok: false, error: invite.error?.message ?? "Could not create the invite." };
      userId = magic.data.user.id;
      link = `${site()}/api/auth/confirm?token_hash=${magic.data.properties.hashed_token}&type=magiclink&next=/admin/mfa`;
    }

    await admin.from("profiles").upsert({ id: userId, email: data.email, full_name: data.name, is_staff: true, is_blocked: false });
    await admin.from("user_roles").delete().eq("user_id", userId);
    await admin.from("user_roles").insert({ user_id: userId, role_id: data.role_id });
    await admin.from("email_queue").insert({ event: "staff_invite", to_email: data.email, payload: { name: data.name, link } });
    await logAudit({ actorId: staff.userId, action: "staff.invite", entity: "profiles", entityId: userId, after: { email: data.email, role_id: data.role_id } });
    after(() => processEmailQueue(3).catch(() => {}));
    revalidatePath("/admin/users");
    return { ok: true, data: { link } };
  });
}

export async function updateStaffRoleAction(userId: string, roleId: string): Promise<ActionResult> {
  return wrap(async () => {
    const staff = await assertPermission("users.update");
    if (userId === staff.userId) return { ok: false, error: "You cannot change your own role." };
    if ((await isSuperAdminRole(roleId)) && !staff.permissions.has("*")) return { ok: false, error: "Only a Super Admin can assign that role." };
    const admin = createAdminClient();
    const { data: before } = await admin.from("user_roles").select("role_id").eq("user_id", userId);
    await admin.from("user_roles").delete().eq("user_id", userId);
    await admin.from("user_roles").insert({ user_id: userId, role_id: roleId });
    await logAudit({ actorId: staff.userId, action: "staff.role", entity: "profiles", entityId: userId, before, after: { role_id: roleId } });
    revalidatePath("/admin/users");
    return { ok: true };
  });
}

export async function setStaffBlockedAction(userId: string, blocked: boolean): Promise<ActionResult> {
  return wrap(async () => {
    const staff = await assertPermission("users.update");
    if (userId === staff.userId) return { ok: false, error: "You cannot block yourself." };
    const admin = createAdminClient();
    await admin.from("profiles").update({ is_blocked: blocked }).eq("id", userId);
    await admin.auth.admin.updateUserById(userId, { ban_duration: blocked ? "876000h" : "none" });
    await logAudit({ actorId: staff.userId, action: blocked ? "staff.block" : "staff.unblock", entity: "profiles", entityId: userId });
    revalidatePath("/admin/users");
    return { ok: true };
  });
}

export async function removeStaffAction(userId: string): Promise<ActionResult> {
  return wrap(async () => {
    const staff = await assertPermission("users.delete");
    if (userId === staff.userId) return { ok: false, error: "You cannot remove yourself." };
    const admin = createAdminClient();
    await admin.from("user_roles").delete().eq("user_id", userId);
    await admin.from("profiles").update({ is_staff: false }).eq("id", userId);
    await logAudit({ actorId: staff.userId, action: "staff.remove", entity: "profiles", entityId: userId });
    revalidatePath("/admin/users");
    return { ok: true };
  });
}

const validPerms = new Set(MODULES.flatMap((m) => ACTIONS.map((a) => `${m}.${a}`)));
const roleSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2, "Enter a role name.").max(50),
  description: z.string().trim().max(200).optional(),
  permissions: z.array(z.string()).transform((a) => a.filter((p) => validPerms.has(p))),
});

export async function saveRoleAction(input: z.infer<typeof roleSchema>): Promise<ActionResult<{ id: string }>> {
  return wrap(async () => {
    const data = roleSchema.parse(input);
    const staff = await assertPermission(data.id ? "roles.update" : "roles.create");
    const admin = createAdminClient();
    let id = data.id;
    if (id) {
      if (await isSuperAdminRole(id)) return { ok: false, error: "Super Admin always has every permission." };
      const { data: before } = await admin.from("role_permissions").select("permission_key").eq("role_id", id);
      await admin.from("roles").update({ name: data.name, description: data.description ?? null }).eq("id", id);
      await admin.from("role_permissions").delete().eq("role_id", id);
      await logAudit({ actorId: staff.userId, action: "role.update", entity: "roles", entityId: id, before, after: data });
    } else {
      const { data: created, error } = await admin.from("roles").insert({ name: data.name, description: data.description ?? null }).select("id").single();
      if (error || !created) return { ok: false, error: error?.code === "23505" ? "A role with this name exists." : "Could not create the role." };
      id = created.id as string;
      await logAudit({ actorId: staff.userId, action: "role.create", entity: "roles", entityId: id, after: data });
    }
    if (data.permissions.length) {
      await admin.from("role_permissions").insert(data.permissions.map((p) => ({ role_id: id, permission_key: p })));
    }
    revalidatePath("/admin/users/roles");
    return { ok: true, data: { id: id! } };
  });
}

export async function deleteRoleAction(id: string): Promise<ActionResult> {
  return wrap(async () => {
    const staff = await assertPermission("roles.delete");
    const admin = createAdminClient();
    const { data: role } = await admin.from("roles").select("is_system,name").eq("id", id).single();
    if (!role || role.is_system) return { ok: false, error: "Built-in roles cannot be deleted." };
    const { count } = await admin.from("user_roles").select("*", { count: "exact", head: true }).eq("role_id", id);
    if (count) return { ok: false, error: "Move staff to another role before deleting this one." };
    await admin.from("roles").delete().eq("id", id);
    await logAudit({ actorId: staff.userId, action: "role.delete", entity: "roles", entityId: id, before: role });
    revalidatePath("/admin/users/roles");
    return { ok: true };
  });
}
