import Link from "next/link";
import { Plus } from "lucide-react";
import { requireStaff } from "@/lib/auth/rbac";
import { createAdminClient } from "@/lib/supabase/admin";
import { enabledCouriers } from "@/lib/couriers";
import { buttonClass } from "@/components/ui/button";
import { OrdersTable, type OrderRow } from "./orders-table";

export const metadata = { title: "Orders" };
const PAGE = 30;
const TABS = ["all", "pending", "confirmed", "processing", "packed", "shipped", "delivered", "cancelled", "returned"];

export default async function OrdersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const staff = await requireStaff("orders.view");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const status = TABS.includes(sp.status ?? "") ? sp.status! : "all";
  const admin = createAdminClient();

  let q = admin.from("orders")
    .select("id,order_number,customer_name,phone,status,payment_status,payment_method,grand_total,courier,tracking_code,fraud_score,source,placed_at,shipping_address", { count: "exact" })
    .order("placed_at", { ascending: false }).range((page - 1) * PAGE, page * PAGE - 1);
  if (status !== "all") q = q.eq("status", status);
  if (sp.q) {
    const term = sp.q.replace(/[%,()]/g, "").trim();
    q = q.or(`order_number.ilike.%${term}%,phone.ilike.%${term}%,customer_name.ilike.%${term}%`);
  }
  if (sp.payment) q = q.eq("payment_status", sp.payment);
  if (sp.from) q = q.gte("placed_at", new Date(sp.from).toISOString());
  if (sp.to) q = q.lte("placed_at", new Date(new Date(sp.to).getTime() + 86400000).toISOString());

  const [{ data, count }, counts, courierList] = await Promise.all([
    q,
    admin.from("orders").select("status").gte("placed_at", new Date(Date.now() - 90 * 86400000).toISOString()),
    enabledCouriers(),
  ]);
  const tally = new Map<string, number>();
  (counts.data ?? []).forEach((o) => tally.set(o.status as string, (tally.get(o.status as string) ?? 0) + 1));

  const rows: OrderRow[] = (data ?? []).map((o) => ({
    id: o.id as string, number: o.order_number as string, name: o.customer_name as string, phone: o.phone as string,
    status: o.status as string, payment: o.payment_status as string, method: o.payment_method as string, total: Number(o.grand_total),
    courier: (o.courier as string) ?? null, tracking: (o.tracking_code as string) ?? null, fraud: o.fraud_score as number, source: o.source as string,
    placedAt: o.placed_at as string, district: (o.shipping_address as { district?: string })?.district ?? "",
  }));

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="headline text-[28px]">Orders</h1>
          <p className="mt-1 text-[14px] text-fg-muted">{count ?? 0} orders</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/orders/returns" className={buttonClass("secondary", "md")}>Returns</Link>
          {staff.can("orders.create") && <Link href="/admin/orders/new" className={buttonClass("primary", "md")}><Plus className="h-4 w-4" />Create order</Link>}
        </div>
      </div>
      <nav className="no-scrollbar mt-6 flex gap-1 overflow-x-auto" aria-label="Status">
        {TABS.map((t) => (
          <Link key={t} href={`/admin/orders${t === "all" ? "" : `?status=${t}`}`}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-[13px] ${status === t ? "bg-fg text-background" : "text-fg-muted hover:bg-fill"}`}>
            {t === "all" ? "All" : t.charAt(0).toUpperCase() + t.slice(1)}{t !== "all" && tally.get(t) ? ` ${tally.get(t)}` : ""}
          </Link>
        ))}
      </nav>
      <OrdersTable rows={rows} total={count ?? 0} page={page} pageSize={PAGE} couriers={courierList} canUpdate={staff.can("orders.update")} />
    </div>
  );
}
