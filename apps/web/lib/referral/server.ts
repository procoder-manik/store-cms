import "server-only";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

export const REF_COOKIE = "ref";

/** Links a newly created account to the customer who invited them (from the ?ref= link cookie). */
export async function applyReferral(userId: string) {
  const jar = await cookies();
  const code = jar.get(REF_COOKIE)?.value?.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
  if (!code) return;
  const admin = createAdminClient();
  const { data: me } = await admin.from("profiles").select("referred_by,created_at,referral_code").eq("id", userId).maybeSingle();
  // Only brand-new accounts, never yourself, never overwrite
  if (!me || me.referred_by || me.referral_code === code || Date.now() - new Date(me.created_at as string).getTime() > 7 * 86400000) return;
  const { data: referrer } = await admin.from("profiles").select("id").eq("referral_code", code).maybeSingle();
  if (!referrer || referrer.id === userId) return;
  await admin.from("profiles").update({ referred_by: referrer.id }).eq("id", userId);
  jar.delete(REF_COOKIE);
}
