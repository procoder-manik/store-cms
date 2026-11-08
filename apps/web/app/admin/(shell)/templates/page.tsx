import { requireStaff } from "@/lib/auth/rbac";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSettingValue } from "@/lib/settings/server";
import { readPostTypes } from "@/lib/content/post-types";
import { resolveTemplates } from "@/lib/theme/templates";
import { TemplateEditor } from "./template-editor";

export const metadata = { title: "Page templates" };

export default async function TemplatesPage() {
  const staff = await requireStaff("content.view");
  const admin = createAdminClient();
  const [saved, types, { data: product }, { data: post }] = await Promise.all([
    getSettingValue("templates"), getSettingValue("post_types"),
    admin.from("products").select("slug").eq("status", "published").order("published_at", { ascending: false }).limit(1).maybeSingle(),
    admin.from("blog_posts").select("slug,post_type").eq("status", "published").order("published_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const t = readPostTypes(types);
  const postPath = post ? `/${t.find((x) => x.id === post.post_type)?.path ?? "blog"}/${post.slug}` : "/blog";
  return (
    <div className="mx-auto max-w-[1600px]">
      <h1 className="headline text-[28px]">Page templates</h1>
      <p className="mt-1 text-[14px] text-fg-muted">Choose how the product page, shop, blog and single posts look. The preview shows a real page; press Save to see changes there.</p>
      <TemplateEditor initial={resolveTemplates(saved)} canEdit={staff.can("content.update")} previews={{ product: product ? `/product/${product.slug}` : "/shop", shop: "/shop", blog: "/blog", post: postPath }} />
    </div>
  );
}
