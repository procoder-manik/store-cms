import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireStaff } from "@/lib/auth/rbac";
import { createAdminClient } from "@/lib/supabase/admin";
import { StatusBadge } from "@/components/admin/orders/status-badge";
import { formatBDT } from "@/lib/utils";
import { CustomerPanel } from "./customer-panel";

export const metadata = { title: "Customer" };

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff("customers.view");
  const { id } = await params;
  const admin = createAdminClient();
  const [{ data: c }, { data: orders }, { data: addresses }] = await Promise.all([
    admin.from("profiles").select("*").eq("id", id).maybeSingle(),
    admin.from("orders").select("id,order_number,status,grand_total,placed_at").eq("user_id", id).order("placed_at", { ascending: false }),
    admin.from("addresses").select("*").eq("user_id", id),
  ]);
  if (!c || c.is_staff) notFound();
  const okOrders = (orders ?? []).filter((o) => !["cancelled", "failed"].includes(o.status as string));
  const spent = okOrders.reduce((s, o) => s + Number(o.grand_total), 0);
  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/admin/customers" className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-fill" aria-label="Back"><ArrowLeft className="h-4 w-4" /></Link>
      <h1 className="headline text-[28px]">{(c.full_name as string) ?? "Customer"}</h1>
      <p className="mt-1 text-[14px] text-fg-muted">{c.email as string} · {c.phone as string} · joined {new Date(c.created_at as string).toLocaleDateString("en-GB")}</p>
      <div className="mt-6 grid grid-cols-3 gap-3">
        {[["Orders", okOrders.length], ["Lifetime value", formatBDT(spent)], ["Average order", formatBDT(okOrders.length ? spent / okOrders.length : 0)]].map(([l, v]) => (
          <div key={l as string} className="rounded-[18px] bg-surface p-4 shadow-card"><p className="text-[13px] text-fg-muted">{l}</p><p className="mt-1 text-[22px] font-semibold">{v}</p></div>
        ))}
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="rounded-[20px] bg-surface p-5 shadow-card">
          <h2 className="text-[17px] font-semibold">Orders</h2>
          <ul className="mt-2">{(orders ?? []).map((o) => (
            <li key={o.id as string} className="flex items-center justify-between border-b border-line py-2.5 text-[14px] last:border-0">
              <Link href={`/admin/orders/${o.id}`} className="font-medium hover:text-accent">{o.order_number as string}</Link>
              <span className="flex items-center gap-3"><StatusBadge status={o.status as string} />{formatBDT(Number(o.grand_total))}</span>
            </li>))}
            {!orders?.length && <li className="py-4 text-fg-muted">No orders yet.</li>}
          </ul>
          {(addresses ?? []).length > 0 && (
            <><h3 className="mt-5 text-[14px] font-semibold">Addresses</h3>
            <ul className="mt-2 space-y-1 text-[14px] text-fg-muted">{addresses!.map((a) => <li key={a.id as string}>{[a.address_line, a.upazila, a.district].filter(Boolean).join(", ")}</li>)}</ul></>
          )}
        </section>
        <CustomerPanel id={id} blocked={c.is_blocked as boolean} note={(c.admin_note as string) ?? ""} points={c.loyalty_points as number} canEdit={staff.can("customers.update")} />
      </div>
    </div>
  );
}
