import Link from "next/link";
import { requireStaff } from "@/lib/auth/rbac";
import { createAdminClient } from "@/lib/supabase/admin";
import { THEMES } from "@/lib/theme/presets";
import { getSettingValue } from "@/lib/settings/server";
import type { SectionRow } from "@/lib/sections/registry";
import { cn } from "@/lib/utils";
import { Builder } from "./builder";

export const metadata = { title: "Page builder" };

export default async function BuilderPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const staff = await requireStaff("content.view");
  const target = (await searchParams).page ?? "home";
  const admin = createAdminClient();
  const [{ data: pages }, { data: cats }] = await Promise.all([
    admin.from("pages").select("id,title,slug,sections,kind").order("title"),
    admin.from("categories").select("id,name").order("name"),
  ]);
  let rows: SectionRow[] = [];
  let previewPath = "/";
  if (target === "home") {
    const { data } = await admin.from("home_sections").select("id,type,title,config,is_active").order("sort_order");
    rows = (data ?? []) as SectionRow[];
    if (!rows.length) {
      const theme = (await getSettingValue<{ theme?: string }>("theme")).theme;
      rows = (THEMES.find((t) => t.id === theme) ?? THEMES[0]!).demo.map((d, i) => ({ id: `new-${i}`, type: d.type, title: d.title ?? null, config: d.config, is_active: true }));
    }
  } else {
    const page = (pages ?? []).find((p) => p.id === target);
    rows = ((page?.sections as SectionRow[] | null) ?? []);
    previewPath = `${page?.kind === "landing" ? "/lp" : "/pages"}/${page?.slug ?? ""}`;
  }
  return (
    <div className="mx-auto max-w-[1600px]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="headline text-[28px]">Page builder</h1><p className="mt-1 text-[14px] text-fg-muted">Add, reorder and design sections. Preview on desktop, tablet and phone before saving.</p></div>
      </div>
      <nav className="no-scrollbar mt-4 flex gap-1 overflow-x-auto" aria-label="Pages">
        <Link href="/admin/builder" className={cn("shrink-0 rounded-full px-4 py-1.5 text-[14px]", target === "home" ? "bg-fg text-background" : "text-fg-muted hover:bg-fill")}>Home page</Link>
        {(pages ?? []).map((p) => <Link key={p.id as string} href={`/admin/builder?page=${p.id}`} className={cn("shrink-0 rounded-full px-4 py-1.5 text-[14px]", target === p.id ? "bg-fg text-background" : "text-fg-muted hover:bg-fill")}>{p.title as string}</Link>)}
      </nav>
      <Builder key={target} target={target} initial={rows} previewPath={previewPath} categories={(cats ?? []) as { id: string; name: string }[]} canEdit={staff.can("content.update")} />
    </div>
  );
}
