import { requireStaff } from "@/lib/auth/rbac";
import { createAdminClient } from "@/lib/supabase/admin";
import { CategoryManager, type CategoryRow } from "./category-manager";

export const metadata = { title: "Categories" };

export default async function CategoriesPage() {
  const staff = await requireStaff("categories.view");
  const admin = createAdminClient();
  const [{ data }, { data: counts }, { data: codes }] = await Promise.all([
    admin.from("categories").select("*").order("sort_order").order("name"),
    admin.from("product_categories").select("category_id"),
    staff.can("code.update") ? admin.from("custom_code").select("entity_id,head,body_start,footer").eq("entity", "category") : Promise.resolve({ data: [] }),
  ]);
  const countMap = new Map<string, number>();
  (counts ?? []).forEach((c) => countMap.set(c.category_id as string, (countMap.get(c.category_id as string) ?? 0) + 1));
  const rows = (data ?? []).map((c) => ({ ...c, product_count: countMap.get(c.id as string) ?? 0 })) as CategoryRow[];
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="headline text-[28px]">Categories</h1>
      <p className="mt-1 text-[14px] text-fg-muted">Organise products into categories and sub-categories.</p>
      <CategoryManager rows={rows} canCreate={staff.can("categories.create")} canUpdate={staff.can("categories.update")} canDelete={staff.can("categories.delete")} canCode={staff.can("code.update")} codes={Object.fromEntries((codes ?? []).map((c) => [c.entity_id as string, { head: c.head as string, body_start: c.body_start as string, footer: c.footer as string }]))} />
    </div>
  );
}
