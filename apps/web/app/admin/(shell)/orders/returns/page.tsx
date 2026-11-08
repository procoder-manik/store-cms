import Link from "next/link";
import { requireStaff } from "@/lib/auth/rbac";
import { createAdminClient } from "@/lib/supabase/admin";
import { StatusBadge } from "@/components/admin/orders/status-badge";
import { ReturnActions } from "./return-actions";

export const metadata = { title: "Returns" };

export default async function ReturnsPage() {
  const staff = await requireStaff("orders.view");
  const { data } = await createAdminClient().from("returns")
    .select("id,items,reason,status,admin_note,created_at,order_id,orders(order_number,customer_name,phone)").order("created_at", { ascending: false }).limit(100);
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="headline text-[28px]">Returns</h1>
      <p className="mt-1 text-[14px] text-fg-muted">Approving a return adds the stock back. Use Refund on the order to pay money back.</p>
      <ul className="mt-6 space-y-3">
        {(data ?? []).map((r) => {
          const o = r.orders as unknown as { order_number: string; customer_name: string; phone: string };
          return (
            <li key={r.id as string} className="rounded-[20px] bg-surface p-5 shadow-card">
              <div className="flex flex-wrap items-center gap-3">
                <Link href={`/admin/orders/${r.order_id}`} className="font-medium hover:text-accent">{o?.order_number}</Link>
                <StatusBadge status={r.status as string} />
                <span className="text-[13px] text-fg-muted">{o?.customer_name} · {o?.phone} · {new Date(r.created_at as string).toLocaleDateString("en-GB")}</span>
              </div>
              <p className="mt-2 text-[14px]">{(r.items as { title: string; quantity: number }[]).map((i) => `${i.title} ×${i.quantity}`).join(", ")}</p>
              <p className="mt-1 text-[14px] text-fg-muted">“{r.reason as string}”</p>
              {r.status === "pending" && staff.can("orders.update") && <ReturnActions id={r.id as string} />}
            </li>
          );
        })}
        {!data?.length && <li className="rounded-[20px] bg-surface p-10 text-center text-fg-muted shadow-card">No return requests.</li>}
      </ul>
    </div>
  );
}
