import { requireStaff } from "@/lib/auth/rbac";
import { createAdminClient } from "@/lib/supabase/admin";
import { TagManager } from "./tag-manager";

export const metadata = { title: "Tags" };

export default async function TagsPage() {
  const staff = await requireStaff("products.view");
  const { data } = await createAdminClient().from("tags").select("id,name,slug,product_tags(count)").order("name");
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="headline text-[28px]">Tags</h1>
      <p className="mt-1 text-[14px] text-fg-muted">Tags are added when you edit a product. Rename, merge or remove them here. Customers can open a tag at /shop?tag=name.</p>
      <TagManager tags={(data ?? []).map((t) => ({ id: t.id as string, name: t.name as string, slug: t.slug as string, count: ((t.product_tags as unknown as { count: number }[])?.[0]?.count) ?? 0 }))} canEdit={staff.can("products.update")} canDelete={staff.can("products.delete")} />
    </div>
  );
}
