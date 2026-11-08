import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";

export const revalidate = 3600;

/** Store icon: the favicon you upload in Settings, or a generated letter on the brand color. */
async function favicon() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return null;
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  return ((await db.from("settings").select("value").eq("key", "store").maybeSingle()).data?.value as { favicon_url?: string } | null)?.favicon_url ?? null;
}

export async function GET(req: Request) {
  const url = await favicon();
  if (url && /^https?:\/\//.test(url)) return Response.redirect(url, 302);
  const small = new URL(req.url).pathname.includes("apple");
  const letter = (process.env.NEXT_PUBLIC_SITE_NAME ?? "Lumen").charAt(0).toUpperCase();
  const size = small ? 180 : 512;
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(145deg,#2997ff,#0071e3)", color: "#fff", fontSize: small ? 110 : 300, fontWeight: 700, borderRadius: small ? 0 : 112 }}>{letter}</div>,
    { width: size, height: size },
  );
}
