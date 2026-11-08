"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { bdPhone } from "@/lib/validators/auth";
import { zodFieldErrors, type ActionResult } from "@/lib/actions/result";

const profileSchema = z.object({
  full_name: z.string().trim().min(2, "name").max(80, "name"),
  phone: bdPhone,
  marketing_opt_in: z.string().optional().transform((v) => v === "on"),
});

export async function updateProfileAction(_: unknown, form: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { ok: false, error: "generic" };
  const parsed = profileSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, error: "generic", fieldErrors: zodFieldErrors(parsed.error.issues) };
  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", data.user.id);
  if (error) return { ok: false, error: "generic" };
  revalidatePath("/account");
  return { ok: true };
}

/** Deletes the customer's account. Orders are kept for accounting but personal details are removed from them. */
export async function deleteAccountAction(confirmText: string): Promise<ActionResult> {
  if (confirmText.trim().toUpperCase() !== "DELETE") return { ok: false, error: "generic" };
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { ok: false, error: "generic" };
  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("is_staff,email").eq("id", data.user.id).single();
  if (profile?.is_staff) return { ok: false, error: "generic" };
  const { count } = await admin.from("orders").select("*", { count: "exact", head: true }).eq("user_id", data.user.id).in("status", ["pending", "confirmed", "processing", "packed", "shipped", "out_for_delivery"]);
  if (count) return { ok: false, error: "openOrders" };
  await admin.from("orders").update({ email: null, customer_note: null, ip: null, user_agent: null }).eq("user_id", data.user.id);
  if (profile?.email) await admin.from("email_queue").insert({ event: "account_deleted", to_email: profile.email, payload: {} });
  await admin.from("newsletter_subscribers").delete().eq("email", profile?.email ?? "");
  await supabase.auth.signOut();
  const { error } = await admin.auth.admin.deleteUser(data.user.id);
  return error ? { ok: false, error: "generic" } : { ok: true };
}
