"use server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/security/ratelimit";
import { verifyTurnstile } from "@/lib/security/turnstile";
import { requestMeta } from "@/lib/security/request";
import { emailOnly, loginSchema, newPasswordSchema, registerSchema, safeNext } from "@/lib/validators/auth";
import { zodFieldErrors, type ActionResult } from "@/lib/actions/result";
import { mergeGuestCart } from "@/lib/cart/server";
import { applyReferral } from "@/lib/referral/server";

/** Error values are translation keys under auth.errors. */
const site = () => process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

async function guard(scope: string, id: string, limit: number, form: FormData) {
  const { ip } = await requestMeta();
  const rl = await rateLimit(`${scope}:${ip ?? "unknown"}:${id}`, limit, 600);
  if (!rl.ok) return "rate";
  const okCaptcha = await verifyTurnstile(form.get("cf-turnstile-response") as string | null, ip);
  if (!okCaptcha) return "captcha";
  return null;
}

export async function signInAction(_: unknown, form: FormData): Promise<ActionResult<{ next: string }>> {
  const parsed = loginSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, error: "invalid", fieldErrors: zodFieldErrors(parsed.error.issues) };
  const blocked = await guard("login", parsed.data.email, 8, form);
  if (blocked) return { ok: false, error: blocked };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { ok: false, error: error.code === "email_not_confirmed" ? "notConfirmed" : "invalid" };
  }
  const { data: profile } = await supabase.from("profiles").select("is_blocked").eq("id", data.user.id).single();
  if (profile?.is_blocked) {
    await supabase.auth.signOut();
    return { ok: false, error: "invalid" };
  }
  await supabase.from("profiles").update({ last_login_at: new Date().toISOString() }).eq("id", data.user.id);
  await mergeGuestCart(data.user.id).catch(() => {});
  return { ok: true, data: { next: safeNext(form.get("next") as string | null) } };
}

export async function signUpAction(_: unknown, form: FormData): Promise<ActionResult> {
  const parsed = registerSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, error: "generic", fieldErrors: zodFieldErrors(parsed.error.issues) };
  const blocked = await guard("signup", "", 5, form);
  if (blocked) return { ok: false, error: blocked };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.name, phone: parsed.data.phone },
      emailRedirectTo: `${site()}/api/auth/callback?next=/account`,
    },
  });
  if (error) return { ok: false, error: error.code === "user_already_exists" ? "exists" : "generic" };
  // Supabase returns a user with no identities when the email is already registered.
  if (data.user && data.user.identities?.length === 0) return { ok: false, error: "exists" };
  if (data.user) await applyReferral(data.user.id).catch(() => {});
  return { ok: true };
}

export async function forgotPasswordAction(_: unknown, form: FormData): Promise<ActionResult> {
  const parsed = emailOnly.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, error: "email" };
  const blocked = await guard("forgot", parsed.data.email, 3, form);
  if (blocked) return { ok: false, error: blocked };
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${site()}/api/auth/callback?next=/reset-password`,
  });
  // Same answer whether or not the account exists (prevents email enumeration).
  return { ok: true };
}

export async function resetPasswordAction(_: unknown, form: FormData): Promise<ActionResult> {
  const parsed = newPasswordSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, error: "password" };
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { ok: false, error: "generic" };
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { ok: false, error: "generic" };
  return { ok: true };
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
}
