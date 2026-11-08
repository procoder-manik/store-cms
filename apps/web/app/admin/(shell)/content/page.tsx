import Link from "next/link";
import { requireStaff } from "@/lib/auth/rbac";
import { createAdminClient } from "@/lib/supabase/admin";
import { cn } from "@/lib/utils";
import { ContentManager } from "./content-manager";
import { ContactFormEditor } from "@/components/admin/settings/contact-form-editor";
import { getSettingValue } from "@/lib/settings/server";

export const metadata = { title: "Content" };
const TABS = [["faq", "FAQ"], ["contact", "Contact form"], ["messages", "Messages"]] as const;

export default async function ContentPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const staff = await requireStaff("content.view");
  const tab = ((await searchParams).tab ?? "faq") as "pages" | "blog" | "faq" | "contact" | "messages";
  const admin = createAdminClient();
  const nav = <nav className="mt-5 flex flex-wrap gap-1">{TABS.map(([k, l]) => <Link key={k} href={`/admin/content?tab=${k}`} className={cn("rounded-full px-4 py-1.5 text-[14px]", tab === k ? "bg-fg text-background" : "text-fg-muted hover:bg-fill")}>{l}</Link>)}</nav>;
  if (tab === "contact") {
    return <div className="mx-auto max-w-5xl"><h1 className="headline text-[28px]">FAQ and forms</h1>{nav}<div className="mt-6"><ContactFormEditor value={(await getSettingValue("contact_form")) as never} canEdit={staff.can("content.update")} /></div></div>;
  }
  if (tab === "messages") {
    const { data } = await admin.from("contact_messages").select("id,name,email,phone,subject,message,data,created_at").order("created_at", { ascending: false }).limit(100);
    return (
      <div className="mx-auto max-w-5xl"><h1 className="headline text-[28px]">FAQ and forms</h1>{nav}
        <ul className="mt-6 space-y-3">{(data ?? []).map((m) => (
          <li key={m.id as string} className="rounded-[20px] bg-surface p-5 shadow-card">
            <div className="flex flex-wrap items-baseline justify-between gap-2"><p className="font-semibold">{(m.subject as string) || (m.name as string)}</p><span className="text-[12px] text-fg-muted">{new Date(m.created_at as string).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</span></div>
            <p className="mt-0.5 text-[13px] text-fg-muted">{m.name as string} · <a className="text-accent" href={`mailto:${m.email}`}>{m.email as string}</a>{m.phone ? ` · ${m.phone}` : ""}</p>
            <p className="mt-3 whitespace-pre-wrap text-[14px]">{m.message as string}</p>
            {Object.entries((m.data as Record<string, string>) ?? {}).filter(([k]) => !["name", "email", "phone", "subject", "message"].includes(k)).map(([k, v]) => <p key={k} className="mt-1 text-[13px]"><span className="text-fg-muted">{k}:</span> {v}</p>)}
          </li>))}
          {!data?.length && <li className="rounded-[20px] bg-surface p-10 text-center text-fg-muted shadow-card">No messages yet.</li>}
        </ul>
      </div>
    );
  }
  const [items, cats] = await Promise.all([
    tab === "pages" ? admin.from("pages").select("*").order("title") : tab === "blog" ? admin.from("blog_posts").select("*").order("created_at", { ascending: false }) : admin.from("faqs").select("*").order("sort_order"),
    admin.from("blog_categories").select("id,name").order("name"),
  ]);
  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="headline text-[28px]">FAQ and forms</h1>
      {nav}
      <ContentManager tab={tab} items={(items.data ?? []) as never} categories={(cats.data ?? []) as never} canEdit={staff.can("content.update")} canDelete={staff.can("content.delete")} />
    </div>
  );
}
