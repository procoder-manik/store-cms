import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";
import { requireStaff } from "@/lib/auth/rbac";
import { createAdminClient } from "@/lib/supabase/admin";
import { enabledCouriers, couriers } from "@/lib/couriers";
import { StatusBadge, STATUS_LABEL } from "@/components/admin/orders/status-badge";
import { buttonClass } from "@/components/ui/button";
import { formatBDT } from "@/lib/utils";
import type { CourierName } from "@/types/domain";
import { OrderPanel } from "./order-panel";

export const metadata = { title: "Order" };

export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff("orders.view");
  const { id } = await params;
  const admin = createAdminClient();
  const { data: o } = await admin.from("orders")
    .select("*, order_items(*), order_status_history(id,from_status,to_status,note,created_at,profiles(full_name)), payments(*), refunds(*), shipments(*), returns(*)")
    .eq("id", id).maybeSingle();
  if (!o) notFound();
  const r = o as Record<string, unknown>;
  const addr = r.shipping_address as Record<string, string>;
  const [{ count: phoneOrders }, courierList] = await Promise.all([
    admin.from("orders").select("*", { count: "exact", head: true }).eq("phone", r.phone as string),
    enabledCouriers(),
  ]);
  const items = (r.order_items as Record<string, unknown>[]) ?? [];
  const history = ((r.order_status_history as Record<string, unknown>[]) ?? []).sort((a, b) => (a.id as number) - (b.id as number));
  const payments = (r.payments as Record<string, unknown>[]) ?? [];
  const shipments = (r.shipments as Record<string, unknown>[]) ?? [];
  const dt = (d: unknown) => new Date(d as string).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Dhaka" });

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/orders" className="flex h-9 w-9 items-center justify-center rounded-full bg-fill" aria-label="Back"><ArrowLeft className="h-4 w-4" /></Link>
        <h1 className="headline text-[26px]">{r.order_number as string}</h1>
        <StatusBadge status={r.status as string} /><StatusBadge status={r.payment_status as string} />
        <div className="ml-auto flex gap-2">
          <a href={`/admin/print/${id}?kind=invoice`} target="_blank" className={buttonClass("secondary", "sm")}><Printer className="h-4 w-4" />Invoice</a>
          <a href={`/admin/print/${id}?kind=slip`} target="_blank" className={buttonClass("secondary", "sm")}>Packing slip</a>
        </div>
      </div>
      <p className="mt-1 text-[13px] text-fg-muted">Placed {dt(r.placed_at)} · {(r.source as string).replace("_", " ")}{r.ip ? ` · IP ${r.ip}` : ""}</p>

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <section className="rounded-[20px] bg-surface p-5 shadow-card">
            <h2 className="text-[17px] font-semibold">Items</h2>
            <ul className="mt-2">
              {items.map((i) => (
                <li key={i.id as string} className="flex gap-3 border-b border-line py-3 last:border-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {i.image_url ? <img src={i.image_url as string} alt="" className="h-14 w-14 rounded-[12px] object-cover" /> : <span className="h-14 w-14 rounded-[12px] bg-fill" />}
                  <div className="min-w-0 flex-1 text-[14px]">
                    {i.product_id ? <Link href={`/admin/products/${i.product_id}`} className="line-clamp-1 hover:text-accent">{i.title as string}</Link> : <p>{i.title as string}</p>}
                    <p className="text-[12px] text-fg-muted">{[i.variant_title, i.sku].filter(Boolean).join(" · ")}</p>
                  </div>
                  <div className="text-right text-[14px]"><p>{formatBDT(Number(i.unit_price))} × {i.quantity as number}</p><p className="font-medium">{formatBDT(Number(i.total))}</p></div>
                </li>
              ))}
            </ul>
            <dl className="ml-auto mt-3 max-w-xs space-y-1 text-[14px]">
              <div className="flex justify-between"><dt className="text-fg-muted">Subtotal</dt><dd>{formatBDT(Number(r.subtotal))}</dd></div>
              {Number(r.discount_total) > 0 && <div className="flex justify-between text-success"><dt>Discount {r.coupon_code ? `(${r.coupon_code})` : ""}</dt><dd>−{formatBDT(Number(r.discount_total))}</dd></div>}
              <div className="flex justify-between"><dt className="text-fg-muted">Delivery</dt><dd>{formatBDT(Number(r.shipping_total))}</dd></div>
              <div className="flex justify-between border-t border-line pt-1.5 text-[16px] font-semibold"><dt>Total</dt><dd>{formatBDT(Number(r.grand_total))}</dd></div>
              <div className="flex justify-between text-fg-muted"><dt>Paid</dt><dd>{formatBDT(Number(r.paid_amount))}</dd></div>
              {Number(r.advance_due) > 0 && <div className="flex justify-between text-fg-muted"><dt>Advance {r.advance_required ? "(required)" : "(chosen)"}</dt><dd>{formatBDT(Number(r.advance_due))}</dd></div>}
              <div className="flex justify-between font-medium"><dt>Collect on delivery</dt><dd>{formatBDT(Math.max(0, Number(r.grand_total) - Number(r.paid_amount)))}</dd></div>
            </dl>
          </section>

          <section className="rounded-[20px] bg-surface p-5 shadow-card">
            <h2 className="text-[17px] font-semibold">Timeline</h2>
            <ol className="mt-3 space-y-3 text-[14px]">
              {history.map((h) => (
                <li key={h.id as number} className="flex gap-3">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" />
                  <div>
                    <p><span className="font-medium">{STATUS_LABEL(h.to_status as string)}</span>{h.note ? <span className="text-fg-muted"> · {h.note as string}</span> : null}</p>
                    <p className="text-[12px] text-fg-subtle">{dt(h.created_at)}{(h.profiles as { full_name: string } | null)?.full_name ? ` · ${(h.profiles as { full_name: string }).full_name}` : ""}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {(payments.length > 0 || shipments.length > 0) && (
            <section className="rounded-[20px] bg-surface p-5 shadow-card text-[14px]">
              <h2 className="text-[17px] font-semibold">Payments and shipments</h2>
              {payments.map((p) => (
                <p key={p.id as string} className="mt-2">{p.gateway as string} · {formatBDT(Number(p.amount))} · <StatusBadge status={p.status as string} /> <span className="font-mono text-[12px] text-fg-muted">{(p.transaction_id as string) ?? (p.gateway_ref as string) ?? ""}</span></p>
              ))}
              {shipments.map((s) => (
                <p key={s.id as string} className="mt-2">
                  {s.courier as string} · <a className="font-mono text-accent" target="_blank" rel="noreferrer" href={couriers[s.courier as CourierName]?.trackingUrl(s.tracking_code as string)}>{s.tracking_code as string}</a> · {s.status as string}
                </p>
              ))}
            </section>
          )}
        </div>

        <aside className="space-y-5">
          <section className="rounded-[20px] bg-surface p-5 text-[14px] shadow-card">
            <h2 className="text-[17px] font-semibold">Customer</h2>
            <p className="mt-2 font-medium">{r.customer_name as string}</p>
            <p><a href={`tel:${r.phone}`} className="text-accent">{r.phone as string}</a> · {phoneOrders ?? 0} orders from this phone</p>
            {r.email ? <p className="text-fg-muted">{r.email as string}</p> : null}
            <p className="mt-2 text-fg-muted">{[addr.address_line, addr.upazila, addr.district, addr.division].filter(Boolean).join(", ")}</p>
            {r.customer_note ? <p className="mt-2 rounded-[12px] bg-fill p-3">{r.customer_note as string}</p> : null}
            {Object.entries((r.custom_fields as Record<string, string>) ?? {}).map(([k, v]) => <p key={k} className="mt-1"><span className="text-fg-muted">{k.replace(/_/g, " ")}:</span> {v}</p>)}
            {(r.fraud_score as number) > 0 && <p className="mt-3 rounded-[12px] bg-warning/15 p-3 text-warning">This phone has {r.fraud_score as number} cancelled or returned orders in the last 6 months. Call before shipping.</p>}
          </section>
          <OrderPanel orderId={id} status={r.status as string} adminNote={(r.admin_note as string) ?? ""} couriers={courierList}
            booked={!!r.consignment_id} paid={Number(r.paid_amount)} method={r.payment_method as string} canUpdate={staff.can("orders.update")} />
        </aside>
      </div>
    </div>
  );
}
