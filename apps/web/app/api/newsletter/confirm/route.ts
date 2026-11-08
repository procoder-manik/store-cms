import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  if (/^[0-9a-f-]{36}$/.test(token)) {
    await createAdminClient().from("newsletter_subscribers").update({ status: "subscribed", token: null }).eq("token", token);
  }
  return NextResponse.redirect(new URL("/?subscribed=1", req.nextUrl.origin));
}
