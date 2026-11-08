import Link from "next/link";
import { Plus } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { buttonClass } from "@/components/ui/button";
import { RowActions } from "./row-actions";

/** Shared list for Pages and Landing pages (WordPress "All pages"). */
export async function PageList({ kind, canEdit, canDelete }: { kind: "page" | "landing"; canEdit: boolean; canDelete: boolean }) {
  const { data } = await createAdminClient().from("pages").select("id,title,slug,is_published,updated_at,hide_chrome,products(title)").eq("kind", kind).order("updated_at", { ascending: false });
  const base = kind === "landing" ? "/admin/landing" : "/admin/pages";
  const publicPath = (slug: string) => (kind === "landing" ? `/lp/${slug}` : `/pages/${slug}`);
  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="headline text-[28px]">{kind === "landing" ? "Landing pages" : "Pages"}</h1>
          <p className="mt-1 text-[14px] text-fg-muted">{kind === "landing" ? "Sales pages for a single product or campaign, built from sections and HTML. Optionally without header and footer." : "About, policies, size guides and any other page. Design them with text or with the Page builder."}</p>
        </div>
        {canEdit && <Link href={`${base}/new`} className={buttonClass("primary", "md")}><Plus className="h-4 w-4" />{kind === "landing" ? "New landing page" : "New page"}</Link>}
      </div>
      <div className="mt-6 overflow-x-auto rounded-[20px] bg-surface shadow-card">
        <table className="w-full min-w-[640px] text-left text-[14px]">
          <thead className="text-[12px] text-fg-muted"><tr className="border-b border-line"><th className="px-5 py-3 font-medium">Title</th><th className="py-3 font-medium">Address</th><th className="py-3 font-medium">Status</th><th className="py-3 font-medium">Updated</th><th /></tr></thead>
          <tbody>
            {(data ?? []).map((p) => (
              <tr key={p.id as string} className="border-b border-line last:border-0 hover:bg-fill/40">
                <td className="px-5 py-3"><Link href={`${base}/${p.id}`} className="font-medium hover:text-accent">{p.title as string}</Link>{kind === "landing" && (p.products as unknown as { title: string } | null)?.title && <p className="text-[12px] text-fg-muted">{(p.products as unknown as { title: string }).title}</p>}</td>
                <td className="py-3"><a href={publicPath(p.slug as string)} target="_blank" rel="noreferrer" className="font-mono text-[12px] text-fg-muted hover:text-accent">{publicPath(p.slug as string)}</a></td>
                <td className="py-3"><span className={p.is_published ? "text-success" : "text-fg-subtle"}>{p.is_published ? "Published" : "Draft"}</span></td>
                <td className="py-3 text-fg-muted">{new Date(p.updated_at as string).toLocaleDateString("en-GB")}</td>
                <td className="px-3 py-3 text-right"><RowActions id={p.id as string} editHref={`${base}/${p.id}`} builderHref={`/admin/builder?page=${p.id}`} canEdit={canEdit} canDelete={canDelete} /></td>
              </tr>
            ))}
            {!data?.length && <tr><td colSpan={5} className="p-10 text-center text-fg-muted">Nothing yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
