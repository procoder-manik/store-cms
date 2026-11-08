import { requireStaff } from "@/lib/auth/rbac";
import { createAdminClient } from "@/lib/supabase/admin";
import { RoleEditor, type RoleRow } from "./role-editor";

export const metadata = { title: "Roles" };

export default async function RolesPage() {
  const staff = await requireStaff("roles.view");
  const { data } = await createAdminClient()
    .from("roles").select("id,name,description,is_system,role_permissions(permission_key)").order("name");
  const roles: RoleRow[] = (data ?? []).map((r) => ({
    id: r.id as string, name: r.name as string, description: (r.description as string | null) ?? "",
    isSystem: r.is_system as boolean,
    permissions: ((r.role_permissions as { permission_key: string }[] | null) ?? []).map((p) => p.permission_key),
  }));
  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="headline text-[28px]">Roles and permissions</h1>
      <p className="mt-1 text-[14px] text-fg-muted">Tick what each role can see and change. Super Admin always has full access.</p>
      <RoleEditor roles={roles} canEdit={staff.can("roles.update")} canCreate={staff.can("roles.create")} canDelete={staff.can("roles.delete")} />
    </div>
  );
}
