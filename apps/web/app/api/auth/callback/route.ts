import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/validators/auth";
import { mergeGuestCart } from "@/lib/cart/server";
import { applyReferral } from "@/lib/referral/server";

/**
 * Handles OAuth (Google/Facebook), email confirmation and password-reset links.
 * Exchanges the one-time code for a session cookie, then redirects.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"), "/account");

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      await supabase.from("profiles").update({ last_login_at: new Date().toISOString() }).eq("id", data.user.id);
      await mergeGuestCart(data.user.id).catch(() => {});
      await applyReferral(data.user.id).catch(() => {});
      return NextResponse.redirect(`${origin}${next}`);
    }
  }
  return NextResponse.redirect(`${origin}/login?error=link`);
}
