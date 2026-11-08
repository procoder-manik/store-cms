import Link from "next/link";
import { Plus } from "lucide-react";
import { requireStaff } from "@/lib/auth/rbac";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSettingValue } from "@/lib/settings/server";
import { readPostTypes } from "@/lib/content/post-types";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CategoryManager, PostTypesEditor, DeletePostButton } from "./post-admin-ui";

export const metadata = { title: "Posts" };

export default async function PostsPage({ searchParams }: { searchParams: Promise<{ type?: string; tab?: string }> }) {
  const staff = await requireStaff("content.view");
  const sp = await searchParams;
  const types = readPostTypes(await getSettingValue("post_types"));
  const type = types.find((t) => t.id === sp.type) ?? types[0]!;
  const admin = createAdminClient();
  const [{ data: posts }, { data: cats }] = await Promise.all([
    admin.from("blog_posts").select("id,title,slug,status,published_at,updated_at,cover_url,blog_categories(name)").eq("post_type", type.id).order("updated_at", { ascending: false }).limit(200),
    admin.from("blog_categories").select("id,name").eq("post_type", type.id).order("name"),
  ]);
  const can = staff.can("content.update");
  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="headline text-[28px]">Posts</h1><p className="mt-1 text-[14px] text-fg-muted">Blog posts, news, buying guides and more. Each type has its own address, categories and page design.</p></div>
        {can && <Link href={`/admin/posts/new?type=${type.id}`} className={buttonClass("primary", "md")}><Plus className="h-4 w-4" />New {type.label.toLowerCase().replace(/s$/, "")}</Link>}
      </div>
      <nav className="no-scrollbar mt-5 flex gap-1 overflow-x-auto">
        {types.map((t) => <Link key={t.id} href={`/admin/posts?type=${t.id}`} className={cn("shrink-0 rounded-full px-4 py-1.5 text-[14px]", t.id === type.id && sp.tab !== "types" ? "bg-fg text-background" : "text-fg-muted hover:bg-fill")}>{t.label}</Link>)}
        <Link href={`/admin/posts?type=${type.id}&tab=types`} className={cn("shrink-0 rounded-full px-4 py-1.5 text-[14px]", sp.tab === "types" ? "bg-fg text-background" : "text-fg-muted hover:bg-fill")}>Post types</Link>
      </nav>
      {sp.tab === "types" ? <div className="mt-6"><PostTypesEditor types={types} canEdit={can} /></div> : (
        <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="overflow-hidden rounded-[20px] bg-surface shadow-card">
            <ul>
              {(posts ?? []).map((p) => (
                <li key={p.id as string} className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {p.cover_url ? <img src={p.cover_url as string} alt="" className="h-12 w-16 rounded-[8px] object-cover" /> : <span className="h-12 w-16 rounded-[8px] bg-fill" />}
                  <div className="min-w-0 flex-1">
                    <Link href={`/admin/posts/${p.id}`} className="line-clamp-1 font-medium hover:text-accent">{p.title as string}</Link>
                    <p className="text-[12px] text-fg-muted">/{type.path}/{p.slug as string} · {(p.blog_categories as unknown as { name: string } | null)?.name ?? "No category"} · <span className={p.status === "published" ? "text-success" : ""}>{p.status as string}</span></p>
                  </div>
                  {staff.can("content.delete") && <DeletePostButton id={p.id as string} />}
                </li>
              ))}
              {!posts?.length && <li className="p-10 text-center text-fg-muted">No {type.label.toLowerCase()} yet.</li>}
            </ul>
          </div>
          <CategoryManager postType={type.id} categories={(cats ?? []) as { id: string; name: string }[]} canEdit={can} />
        </div>
      )}
    </div>
  );
}
