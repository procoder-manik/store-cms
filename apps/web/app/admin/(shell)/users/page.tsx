import Link from "next/link";
import { requireStaff } from "@/lib/auth/rbac";
import { createAdminClient } from "@/lib/supabase/admin";
import { StaffManager, type StaffRow } from "./staff-manager";

export const metadata = { title: "Staff" };

export default async function UsersPage() {
  const staff = await requireStaff("users.view");
  const admin = createAdminClient();
  const [{ data: people }, { data: roles }] = await Promise.all([
    admin.from("profiles")
      .select("id,full_name,email,phone,is_blocked,last_login_at,user_roles(role_id,roles(name))")
      .eq("is_staff", true).order("created_at"),
    admin.from("roles").select("id,name").order("name"),
  ]);

  const rows: StaffRow[] = (people ?? []).map((p) => {
    const ur = (p.user_roles as unknown as { role_id: string; roles: { name: string } | null }[] | null)?.[0];
    return {
      id: p.id as string, name: p.full_name as string | null, email: p.email as string | null,
      blocked: p.is_blocked as boolean, lastLogin: p.last_login_at as string | null,
      roleId: ur?.role_id ?? null, roleName: ur?.roles?.name ?? null,
    };
  });

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="headline text-[28px]">Staff</h1>
          <p className="mt-1 text-[14px] text-fg-muted">Invite people and choose what each of them can do.</p>
        </div>
        <Link href="/admin/users/roles" className="text-[14px] text-accent hover:underline">Edit roles and permissions</Link>
      </div>
      <StaffManager rows={rows} roles={(roles ?? []) as { id: string; name: string }[]} selfId={staff.userId}
        canCreate={staff.can("users.create")} canUpdate={staff.can("users.update")} canDelete={staff.can("users.delete")} />
    </div>
  );
}
