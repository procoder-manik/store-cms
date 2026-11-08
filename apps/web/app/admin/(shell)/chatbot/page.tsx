import Link from "next/link";
import { requireStaff } from "@/lib/auth/rbac";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSettingValue, secretKeysSet } from "@/lib/settings/server";
import { DEFAULT_FREE_MODELS, aiReady } from "@/lib/ai/chat";
import { BrainPanel, TeachButton } from "./brain-panel";
import { SettingsForm } from "@/components/admin/settings/settings-form";
import { cn } from "@/lib/utils";
import { KnowledgeManager } from "./knowledge-manager";

export const metadata = { title: "Chatbot" };

export default async function ChatbotPage({ searchParams }: { searchParams: Promise<{ session?: string }> }) {
  const staff = await requireStaff("chatbot.view");
  const sp = await searchParams;
  const admin = createAdminClient();
  const [cfg, ai, aiSecrets, ready, { data: kb }, { data: sessions }, { data: recentQs }, convo] = await Promise.all([
    getSettingValue("chatbot"), getSettingValue("chatbot.ai"), secretKeysSet("chatbot.ai"), aiReady(),
    admin.from("chatbot_knowledge").select("*").order("updated_at", { ascending: false }),
    admin.from("chat_sessions").select("id,locale,started_at,last_message_at,profiles(full_name)").order("last_message_at", { ascending: false }).limit(30),
    admin.from("chat_messages").select("content").eq("role", "user").order("created_at", { ascending: false }).limit(200),
    sp.session ? admin.from("chat_messages").select("id,role,content,tool_calls,created_at").eq("session_id", sp.session).order("id") : Promise.resolve({ data: null }),
  ]);
  const freq = new Map<string, number>();
  (recentQs ?? []).forEach((m) => { const k = String(m.content).toLowerCase().trim().slice(0, 80); freq.set(k, (freq.get(k) ?? 0) + 1); });
  const top = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div>
        <h1 className="headline text-[28px]">Chatbot</h1>
        <p className="mt-1 text-[14px] text-fg-muted">
          {ready ? "AI is connected." : "Add a free OpenRouter key below to turn the chatbot on."} It reads products, prices, stock, coupons, delivery and orders live, and keeps a store profile (its brain) that refreshes every day.
        </p>
      </div>
      <SettingsForm settingKey="chatbot" title="Assistant" canEdit={staff.can("chatbot.update")} values={cfg} fields={[
        { name: "enabled", label: "Show the chat button in the store", type: "switch" }, { name: "name", label: "Assistant name", type: "text" },
        { name: "welcome_en", label: "Welcome message (English)", type: "text" }, { name: "welcome_bn", label: "Welcome message (Bangla)", type: "text" },
      ]} />
      <SettingsForm settingKey="chatbot.ai" title="AI engine" description="OpenRouter gives free access to many models. If one is busy, the next is used automatically. Get a free key at openrouter.ai/keys. Gemini can be added as a backup." canEdit={staff.can("chatbot.update")}
        values={{ provider: "openrouter", ...ai }} savedSecrets={aiSecrets} fields={[
          { name: "provider", label: "Main provider", type: "select", options: [{ value: "openrouter", label: "OpenRouter (free models, auto switch)" }, { value: "gemini", label: "Google Gemini" }] },
          { name: "openrouter_key", label: "OpenRouter API key", type: "secret" },
          { name: "models", label: "Models to try, in order (one per line)", type: "textarea", hint: `Free models change often; see openrouter.ai/models?q=free. Default: ${DEFAULT_FREE_MODELS.slice(0, 2).join(", ")} and more.` },
          { name: "gemini_key", label: "Gemini API key (optional backup)", type: "secret" },
          { name: "gemini_model", label: "Gemini model", type: "text", hint: "Default gemini-2.5-flash" },
        ]} />
      <BrainPanel brain={String((cfg as { brain?: string }).brain ?? "")} updated={String((cfg as { brain_updated_at?: string }).brain_updated_at ?? "")} canEdit={staff.can("chatbot.update")} />
      <KnowledgeManager items={(kb ?? []) as never} canEdit={staff.can("chatbot.update")} />
      <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        <section className="rounded-[20px] bg-surface p-5 shadow-card">
          <h2 className="text-[17px] font-semibold">Conversations</h2>
          <ul className="mt-2">
            {(sessions ?? []).map((s) => (
              <li key={s.id as string}>
                <Link href={`/admin/chatbot?session=${s.id}`} className={cn("block rounded-[10px] px-2 py-2 text-[14px] hover:bg-fill", sp.session === s.id && "bg-fill")}>
                  {(s.profiles as unknown as { full_name: string | null })?.full_name ?? "Visitor"} <span className="text-[12px] text-fg-muted">· {new Date(s.last_message_at as string).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}</span>
                </Link>
              </li>
            ))}
            {!sessions?.length && <li className="text-[14px] text-fg-muted">No chats yet.</li>}
          </ul>
          {top.length > 0 && (<><h3 className="mt-5 text-[14px] font-semibold">Most asked</h3><ul className="mt-2 space-y-1 text-[13px] text-fg-muted">{top.map(([q, n]) => <li key={q} className="flex justify-between gap-2"><span className="truncate">{q}</span><span>{n}</span></li>)}</ul></>)}
        </section>
        <section className="rounded-[20px] bg-surface p-5 shadow-card">
          {convo.data ? (
            <div className="space-y-2">
              {convo.data.map((m) => (
                <div key={m.id as number} className={cn("flex flex-col", m.role === "user" ? "items-end" : "items-start")}>
                  <p className={cn("max-w-[80%] whitespace-pre-wrap rounded-[18px] px-3.5 py-2 text-[14px]", m.role === "user" ? "bg-accent text-accent-contrast" : "bg-fill")}>{m.content as string}</p>
                  {m.tool_calls ? <p className="mt-0.5 text-[11px] text-fg-subtle">{(() => { const tc = m.tool_calls as { tools?: { name: string }[]; model?: string } | { name: string }[]; const tools = Array.isArray(tc) ? tc : tc.tools ?? []; return [tools.length ? `Used: ${tools.map((t) => t.name).join(", ")}` : "", !Array.isArray(tc) && tc.model ? `Model: ${tc.model}` : ""].filter(Boolean).join(" · "); })()}</p> : null}
                  {m.role === "assistant" && staff.can("chatbot.update") && <TeachButton answer={m.content as string} question={String((convo.data ?? [])[(convo.data ?? []).findIndex((x) => x.id === m.id) - 1]?.content ?? "")} />}
                </div>
              ))}
            </div>
          ) : <p className="py-10 text-center text-fg-muted">Choose a conversation to read it.</p>}
        </section>
      </div>
    </div>
  );
}
