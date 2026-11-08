import { requireStaff } from "@/lib/auth/rbac";
import { createAdminClient } from "@/lib/supabase/admin";
import { BrandManager } from "./brand-manager";

export const metadata = { title: "Brands" };

export default async function BrandsPage() {
  const staff = await requireStaff("products.view");
  const admin = createAdminClient();
  const { data } = await admin.from("brands").select("id,name,slug,logo_url,is_active,products(count)").order("name");
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="headline text-[28px]">Brands</h1>
      <p className="mt-1 text-[14px] text-fg-muted">Group products by brand. Customers can open a brand at /shop?brand=name, and the logos can appear in the Brand logos section.</p>
      <BrandManager brands={(data ?? []).map((b) => ({ id: b.id as string, name: b.name as string, slug: b.slug as string, logo_url: (b.logo_url as string) ?? "", is_active: b.is_active as boolean, count: ((b.products as unknown as { count: number }[])?.[0]?.count) ?? 0 }))}
        canEdit={staff.can("products.update")} canDelete={staff.can("products.delete")} />
    </div>
  );
}
