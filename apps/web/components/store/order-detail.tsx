import { getLocale, getTranslations } from "next-intl/server";
import { Check } from "lucide-react";
import { cn, formatBDT } from "@/lib/utils";
import type { OrderView } from "@/lib/data/orders";

const FLOW = ["pending", "confirmed", "processing", "shipped", "out_for_delivery", "delivered"];

export async function OrderDetail({ order }: { order: OrderView }) {
  const t = await getTranslations("order");
  const tc = await getTranslations("checkout");
  const locale = (await getLocale()) as "en" | "bn";
  const reached = new Map(order.history.map((h) => [h.to_status, h.created_at]));
  const stopped = ["cancelled", "returned", "refunded", "failed"].includes(order.status);
  const currentIdx = FLOW.indexOf(order.status === "packed" ? "processing" : order.status);
  const date = (d: string) => new Date(d).toLocaleString(locale === "bn" ? "bn-BD" : "en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Dhaka" });

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-5">
        <section className="rounded-[20px] bg-surface p-5 shadow-card">
          <h2 className="text-[17px] font-semibold">{t("status")}</h2>
          {stopped ? (
            <p className="mt-3 rounded-[12px] bg-danger/10 p-3 text-danger">{t(`statuses.${order.status}` as "statuses.pending")}</p>
          ) : (
            <ol className="mt-4 space-y-0">
              {FLOW.map((s, i) => {
                const done = i <= currentIdx;
                return (
                  <li key={s} className="relative flex gap-3 pb-5 last:pb-0">
                    {i < FLOW.length - 1 && <span className={cn("absolute left-[11px] top-6 h-full w-0.5", i < currentIdx ? "bg-success" : "bg-fill")} />}
                    <span className={cn("relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full", done ? "bg-success text-white" : "bg-fill")}>{done && <Check className="h-3.5 w-3.5" />}</span>
                    <div className="text-[14px]">
                      <p className={done ? "font-medium" : "text-fg-muted"}>{t(`statuses.${s}` as "statuses.pending")}</p>
                      {reached.get(s) && <p className="text-[12px] text-fg-subtle">{date(reached.get(s)!)}</p>}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
          {order.tracking_code && <p className="mt-4 text-[14px]">{t("courierTracking")}: <span className="font-mono">{order.courier} {order.tracking_code}</span></p>}
        </section>

        <section className="rounded-[20px] bg-surface p-5 shadow-card">
          <h2 className="text-[17px] font-semibold">{t("items")}</h2>
          <ul className="mt-2">
            {order.items.map((i) => (
              <li key={i.id} className="flex gap-3 border-b border-line py-3 last:border-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {i.image_url ? <img src={i.image_url} alt="" className="h-16 w-16 rounded-[12px] object-cover" /> : <span className="h-16 w-16 rounded-[12px] bg-fill" />}
                <div className="min-w-0 flex-1 text-[14px]">
                  <p className="line-clamp-2">{i.title}</p>
                  <p className="text-[12px] text-fg-muted">{i.variant_title ? `${i.variant_title} · ` : ""}{formatBDT(i.unit_price, locale)} × {i.quantity}</p>
                </div>
                <span className="text-[14px] font-medium">{formatBDT(i.total, locale)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <aside className="space-y-5">
        <section className="rounded-[20px] bg-surface p-5 shadow-card">
          <dl className="space-y-1.5 text-[14px]">
            <div className="flex justify-between"><dt className="text-fg-muted">{tc("subtotal")}</dt><dd>{formatBDT(order.subtotal, locale)}</dd></div>
            {order.discount_total > 0 && <div className="flex justify-between text-success"><dt>{tc("discount")}{order.coupon_code && ` (${order.coupon_code})`}</dt><dd>−{formatBDT(order.discount_total, locale)}</dd></div>}
            <div className="flex justify-between"><dt className="text-fg-muted">{tc("shipping")}</dt><dd>{order.shipping_total ? formatBDT(order.shipping_total, locale) : tc("free")}</dd></div>
            <div className="flex justify-between border-t border-line pt-2 text-[17px] font-semibold"><dt>{tc("total")}</dt><dd>{formatBDT(order.grand_total, locale)}</dd></div>
          </dl>
          {order.paid_amount > 0 && order.payment_status !== "paid" && (
            <dl className="mt-3 space-y-1 rounded-[12px] bg-accent-soft p-3 text-[14px]">
              <div className="flex justify-between"><dt>{tc("payNow")}</dt><dd>{formatBDT(order.paid_amount, locale)}</dd></div>
              <div className="flex justify-between font-medium"><dt>{tc("onDelivery")}</dt><dd>{formatBDT(Math.max(0, order.grand_total - order.paid_amount), locale)}</dd></div>
            </dl>
          )}
          <p className="mt-3 text-[13px] text-fg-muted">{t("paymentMethod")}: {order.payment_method === "cod" ? tc("cod") : order.payment_method}</p>
        </section>
        <section className="rounded-[20px] bg-surface p-5 text-[14px] shadow-card">
          <h2 className="font-semibold">{t("shipTo")}</h2>
          <p className="mt-2">{order.customer_name}</p>
          <p className="text-fg-muted">{order.phone}</p>
          <p className="mt-1 text-fg-muted">{[order.shipping_address.address_line, order.shipping_address.upazila, order.shipping_address.district].filter(Boolean).join(", ")}</p>
        </section>
      </aside>
    </div>
  );
}
