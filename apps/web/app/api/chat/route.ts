import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/security/ratelimit";
import { getSettingValue } from "@/lib/settings/server";
import { aiReady, chat, type Turn } from "@/lib/ai/chat";

export const maxDuration = 60;
const schema = z.object({ message: z.string().trim().min(1).max(800), visitorId: z.string().regex(/^[a-zA-Z0-9-]{8,64}$/), sessionId: z.string().uuid().nullable().optional(), locale: z.enum(["en", "bn"]).default("en") });

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid message" }, { status: 400 });
  const d = parsed.data;
  const ip = req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "x";
  if (!(await rateLimit(`chat:${ip}`, 30, 600)).ok || !(await rateLimit(`chat-v:${d.visitorId}`, 40, 3600)).ok) {
    return NextResponse.json({ error: "You are sending messages very fast. Please wait a few minutes." }, { status: 429 });
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !(await aiReady())) return NextResponse.json({ error: "Chat is not available right now." }, { status: 503 });
  const cfg = await getSettingValue<{ enabled?: boolean; name?: string }>("chatbot");
  if (cfg.enabled === false) return NextResponse.json({ error: "Chat is not available right now." }, { status: 503 });

  const admin = createAdminClient();
  const { data: auth } = await (await createClient()).auth.getUser();
  let sessionId = d.sessionId ?? null;
  if (sessionId) {
    const { data: s } = await admin.from("chat_sessions").select("id").eq("id", sessionId).eq("visitor_id", d.visitorId).maybeSingle();
    if (!s) sessionId = null;
  }
  if (!sessionId) {
    const { data: s } = await admin.from("chat_sessions").insert({ visitor_id: d.visitorId, user_id: auth.user?.id ?? null, locale: d.locale }).select("id").single();
    sessionId = s!.id as string;
  }
  const { data: past } = await admin.from("chat_messages").select("role,content").eq("session_id", sessionId).in("role", ["user", "assistant"]).order("id", { ascending: false }).limit(12);
  const history: Turn[] = (past ?? []).reverse().map((m) => ({ role: m.role === "user" ? "user" : "assistant", text: m.content as string }));
  history.push({ role: "user", text: d.message });
  await admin.from("chat_messages").insert({ session_id: sessionId, role: "user", content: d.message });

  try {
    const store = await getSettingValue<{ name?: string }>("store");
    const out = await chat(history, { store: store.name ?? process.env.NEXT_PUBLIC_SITE_NAME ?? "our store", botName: cfg.name ?? "Lumi", locale: d.locale });
    await admin.from("chat_messages").insert({ session_id: sessionId, role: "assistant", content: out.text, tool_calls: out.toolLog.length || out.model ? { tools: out.toolLog, model: out.model } : null });
    await admin.from("chat_sessions").update({ last_message_at: new Date().toISOString() }).eq("id", sessionId);
    return NextResponse.json({ sessionId, reply: out.text, products: out.products });
  } catch (e) {
    console.error("chat failed", e);
    return NextResponse.json({ sessionId, error: "I could not answer just now. Please try again in a moment." }, { status: 502 });
  }
}
