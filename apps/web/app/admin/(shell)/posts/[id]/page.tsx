import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth/rbac";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSettingValue } from "@/lib/settings/server";
import { readPostTypes } from "@/lib/content/post-types";
import { PostEditor } from "./post-editor";

export const metadata = { title: "Edit post" };

export default async function EditPost({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ type?: string }> }) {
  const staff = await requireStaff("content.view");
  const { id } = await params;
  const types = readPostTypes(await getSettingValue("post_types"));
  const admin = createAdminClient();
  let post;
  if (id === "new") {
    const type = (await searchParams).type ?? types[0]!.id;
    post = { post_type: type, title: "", slug: "", excerpt: "", content_html: "", cover_url: "", category_id: null, tags: [], related_product_ids: [], show_toc: true, status: "draft" as const, published_at: null, seo: {} };
  } else {
    const { data } = await admin.from("blog_posts").select("*").eq("id", id).maybeSingle();
    if (!data) notFound();
    post = { id: data.id, post_type: data.post_type ?? "post", title: data.title, slug: data.slug, excerpt: data.excerpt ?? "", content_html: data.content_html ?? "", cover_url: data.cover_url ?? "",
      category_id: data.category_id, tags: data.tags ?? [], related_product_ids: data.related_product_ids ?? [], show_toc: data.show_toc !== false, status: data.status, published_at: data.published_at, seo: data.seo ?? {} };
  }
  const code = id === "new" ? null : (await admin.from("custom_code").select("head,body_start,footer").eq("entity", "post").eq("entity_id", id).maybeSingle()).data;
  const { data: cats } = await admin.from("blog_categories").select("id,name").eq("post_type", post.post_type).order("name");
  return <PostEditor initial={post} types={types} categories={(cats ?? []) as { id: string; name: string }[]} code={code} canCode={staff.can("code.update")} />;
}
