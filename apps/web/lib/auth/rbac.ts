import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { PermissionKey } from "./permissions";

export interface StaffContext {
  userId: string;
  email: string | null;
  name: string | null;
  permissions: Set<string>;
  mfaOk: boolean;
  can: (perm: PermissionKey) => boolean;
}

/** Staff must use TOTP 2FA unless STAFF_REQUIRE_2FA=false (useful only for first local setup). */
export const require2fa = () => process.env.STAFF_REQUIRE_2FA !== "false";

/** Loads the signed-in staff member once per request. Returns null for non-staff. */
export const getStaff = cache(async (): Promise<StaffContext | null> => {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data: profile } = await supabase
    .from("profiles").select("full_name,is_staff,is_blocked").eq("id", auth.user.id).single();
  if (!profile?.is_staff || profile.is_blocked) return null;

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const mfaOk = !require2fa() || aal?.currentLevel === "aal2";

  const { data: perms } = await supabase.rpc("my_permissions");
  const set = new Set<string>(((perms ?? []) as string[]).filter(Boolean));
  return {
    userId: auth.user.id,
    email: auth.user.email ?? null,
    name: profile.full_name,
    permissions: set,
    mfaOk,
    can: (perm) => mfaOk && (set.has("*") || set.has(perm)),
  };
});

/** Use at the top of every admin page and server action. */
export async function requireStaff(perm?: PermissionKey) {
  const staff = await getStaff();
  if (!staff) redirect("/admin/login");
  if (!staff.mfaOk) redirect("/admin/mfa");
  if (perm && !staff.can(perm)) redirect("/admin?denied=" + encodeURIComponent(perm));
  return staff;
}

/** For server actions: returns an error instead of redirecting. */
export async function assertPermission(perm: PermissionKey) {
  const staff = await getStaff();
  if (!staff || !staff.can(perm)) throw new Error("You do not have permission for this action.");
  return staff;
}
