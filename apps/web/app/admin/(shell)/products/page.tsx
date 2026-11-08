import Link from "next/link";
import { Plus } from "lucide-react";
import { requireStaff } from "@/lib/auth/rbac";
import { createAdminClient } from "@/lib/supabase/admin";
import { buttonClass } from "@/components/ui/button";
import { ProductTable, type ProductRow } from "./product-table";

export const metadata = { title: "Products" };
const PAGE = 25;

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; category?: string; page?: string }> }) {
  const staff = await requireStaff("products.view");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const admin = createAdminClient();

  let q = admin.from("products")
    .select("id,title,slug,status,price,stock,track_inventory,low_stock_threshold,sku,source_platform,published_at,updated_at,product_media(url,type,sort_order)" + (sp.category ? ",product_categories!inner(category_id)" : ""), { count: "exact" })
    .order("updated_at", { ascending: false })
    .range((page - 1) * PAGE, page * PAGE - 1);
  if (sp.q) q = q.or(`title.ilike.%${sp.q.replace(/[%,()]/g, "")}%,sku.ilike.%${sp.q.replace(/[%,()]/g, "")}%`);
  if (sp.status) q = q.eq("status", sp.status);
  if (sp.category) q = q.eq("product_categories.category_id", sp.category);
  const [{ data, count }, { data: cats }] = await Promise.all([q, admin.from("categories").select("id,name").order("name")]);

  const rows: ProductRow[] = ((data ?? []) as unknown as Record<string, unknown>[]).map((p) => {
    const media = ((p.product_media as { url: string; type: string; sort_order: number }[]) ?? []).sort((a, b) => a.sort_order - b.sort_order);
    return {
      id: p.id as string, title: p.title as string, slug: p.slug as string, status: p.status as string,
      price: Number(p.price), stock: p.stock as number, trackInventory: p.track_inventory as boolean,
      lowStock: (p.stock as number) <= (p.low_stock_threshold as number), sku: (p.sku as string) ?? "",
      source: p.source_platform as string, image: media.find((m) => m.type === "image")?.url ?? null,
      scheduled: !!p.published_at && new Date(p.published_at as string) > new Date(),
    };
  });

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="headline text-[28px]">Products</h1>
          <p className="mt-1 text-[14px] text-fg-muted">{count ?? 0} products</p>
        </div>
        {staff.can("products.create") && <Link href="/admin/products/new" className={buttonClass("primary", "md")}><Plus className="h-4 w-4" />Add product</Link>}
      </div>
      <ProductTable rows={rows} total={count ?? 0} page={page} pageSize={PAGE} categories={(cats ?? []) as { id: string; name: string }[]}
        filters={{ q: sp.q ?? "", status: sp.status ?? "", category: sp.category ?? "" }}
        canUpdate={staff.can("products.update")} canDelete={staff.can("products.delete")} canCreate={staff.can("products.create")} />
    </div>
  );
}
