import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth/rbac";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrder } from "@/lib/data/orders";
import { invoiceStore } from "@/lib/data/invoice-store";
import { Invoice } from "@/components/invoice";
import { PrintTrigger } from "@/components/print-trigger";

export const dynamic = "force-dynamic";

/** /admin/print/<order id or comma separated ids>?kind=invoice|slip prints one page per order. */
export default async function PrintPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ kind?: string }> }) {
  await requireStaff("orders.view");
  const { id } = await params;
  const kind = (await searchParams).kind === "slip" ? "slip" : "invoice";
  const ids = decodeURIComponent(id).split(",").slice(0, 50);
  const { data } = await createAdminClient().from("orders").select("order_number").in("id", ids);
  const orders = (await Promise.all((data ?? []).map((o) => getOrder(o.order_number as string)))).filter(Boolean);
  if (!orders.length) notFound();
  const store = await invoiceStore();
  return (
    <div className="bg-white">
      {orders.map((o) => <div key={o!.id} style={{ breakAfter: "page" }}><Invoice order={o!} store={store} kind={kind} /></div>)}
      <PrintTrigger />
    </div>
  );
}
