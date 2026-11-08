import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/** When an address changes, keep the old link working with a 301 redirect, and clear any redirect that would now loop. */
export async function redirectOnSlugChange(admin: SupabaseClient, base: string, oldSlug: string | null | undefined, newSlug: string | null | undefined) {
  if (!oldSlug || !newSlug || oldSlug === newSlug) return;
  const from = `${base}/${oldSlug}`, to = `${base}/${newSlug}`;
  await admin.from("redirects").delete().eq("from_path", to);
  await admin.from("redirects").upsert({ from_path: from, to_path: to, code: 301 }, { onConflict: "from_path" });
  // Anything that pointed at the old address now points at the new one
  await admin.from("redirects").update({ to_path: to }).eq("to_path", from);
}
