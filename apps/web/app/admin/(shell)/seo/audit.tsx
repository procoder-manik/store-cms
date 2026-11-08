import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { Check, X } from "lucide-react";

/** Lists every public URL with its SEO status so gaps are easy to find. */
export async function SeoAudit() {
  const admin = createAdminClient();
  const [products, cats, pages, posts] = await Promise.all([
    admin.from("products").select("id,title,slug,seo,short_description").eq("status", "published").limit(500),
    admin.from("categories").select("id,name,slug,seo,description").eq("is_active", true).limit(200),
    admin.from("pages").select("id,title,slug,kind,seo,is_published").eq("is_published", true).limit(200),
    admin.from("blog_posts").select("id,title,slug,post_type,seo,excerpt").eq("status", "published").limit(500),
  ]);
  type Row = { kind: string; title: string; url: string; edit: string; seo: Record<string, unknown>; fallbackDesc: boolean };
  const rows: Row[] = [
    ...(products.data ?? []).map((p) => ({ kind: "Product", title: p.title as string, url: `/product/${p.slug}`, edit: `/admin/products/${p.id}`, seo: (p.seo ?? {}) as Row["seo"], fallbackDesc: !!p.short_description })),
    ...(cats.data ?? []).map((c) => ({ kind: "Category", title: c.name as string, url: `/category/${c.slug}`, edit: "/admin/categories", seo: (c.seo ?? {}) as Row["seo"], fallbackDesc: !!c.description })),
    ...(pages.data ?? []).map((p) => ({ kind: p.kind === "landing" ? "Landing" : "Page", title: p.title as string, url: `${p.kind === "landing" ? "/lp" : "/pages"}/${p.slug}`, edit: `${p.kind === "landing" ? "/admin/landing" : "/admin/pages"}/${p.id}`, seo: (p.seo ?? {}) as Row["seo"], fallbackDesc: false })),
    ...(posts.data ?? []).map((p) => ({ kind: "Post", title: p.title as string, url: `/${p.post_type === "post" ? "blog" : p.post_type}/${p.slug}`, edit: `/admin/posts/${p.id}`, seo: (p.seo ?? {}) as Row["seo"], fallbackDesc: !!p.excerpt })),
  ];
  const missing = rows.filter((r) => !r.seo.description && !r.fallbackDesc);
  const noindex = rows.filter((r) => r.seo.noindex);
  const stat = (n: number, label: string, bad?: boolean) => <div className="rounded-[16px] bg-fill/60 p-4"><p className={`text-[24px] font-semibold ${bad && n ? "text-warning" : ""}`}>{n}</p><p className="text-[13px] text-fg-muted">{label}</p></div>;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stat(rows.length, "Public URLs")}{stat(missing.length, "Without a description", true)}{stat(noindex.length, "Hidden from search")}{stat(rows.filter((r) => ((r.seo.schemas as unknown[]) ?? []).length).length, "With extra schema")}
      </div>
      <div className="overflow-x-auto rounded-[20px] bg-surface shadow-card">
        <table className="w-full min-w-[720px] text-left text-[14px]">
          <thead className="text-[12px] text-fg-muted"><tr className="border-b border-line"><th className="px-5 py-3 font-medium">Page</th><th className="py-3 font-medium">Type</th><th className="py-3 font-medium">Title</th><th className="py-3 font-medium">Description</th><th className="py-3 font-medium">Indexed</th><th /></tr></thead>
          <tbody>
            {rows.sort((a, b) => Number(!!a.seo.description || a.fallbackDesc) - Number(!!b.seo.description || b.fallbackDesc)).slice(0, 300).map((r) => (
              <tr key={r.url} className="border-b border-line last:border-0">
                <td className="max-w-[280px] px-5 py-2.5"><p className="truncate font-medium">{r.title}</p><p className="truncate font-mono text-[11px] text-fg-muted">{r.url}</p></td>
                <td className="py-2.5 text-fg-muted">{r.kind}</td>
                <td className="py-2.5">{r.seo.title ? <Check className="h-4 w-4 text-success" /> : <span className="text-[12px] text-fg-subtle">auto</span>}</td>
                <td className="py-2.5">{r.seo.description ? <Check className="h-4 w-4 text-success" /> : r.fallbackDesc ? <span className="text-[12px] text-fg-subtle">auto</span> : <X className="h-4 w-4 text-warning" />}</td>
                <td className="py-2.5">{r.seo.noindex ? <span className="text-warning">No</span> : "Yes"}</td>
                <td className="px-3 py-2.5 text-right"><Link href={r.edit} className="text-accent">Edit</Link></td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={6} className="p-10 text-center text-fg-muted">No published pages yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
