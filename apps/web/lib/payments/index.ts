import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSettingValue } from "@/lib/settings/server";
import type { OrderSummary, PaymentMethod } from "@/types/domain";
import type { PaymentProvider } from "./types";
import { sslcommerz } from "./sslcommerz";
import { bkash } from "./bkash";

const cod: PaymentProvider = {
  id: "cod",
  async createPayment() { return { redirectUrl: null }; },
  async verifyPayment() { return { ok: true, raw: null }; },
};

export const providers: Record<PaymentMethod, PaymentProvider> = { cod, sslcommerz, bkash };

/** Payment methods to show at checkout, in order. */
export async function enabledPaymentMethods(): Promise<PaymentMethod[]> {
  const [checkout, ssl, bk] = await Promise.all([
    getSettingValue<{ cod_enabled?: boolean }>("checkout"),
    getSettingValue<{ enabled?: boolean; enc?: string }>("payment.sslcommerz"),
    getSettingValue<{ enabled?: boolean; enc?: string }>("payment.bkash"),
  ]);
  const list: PaymentMethod[] = [];
  if (bk.enabled && bk.enc) list.push("bkash");
  if (ssl.enabled && ssl.enc) list.push("sslcommerz");
  if (checkout.cod_enabled !== false) list.push("cod");
  return list;
}

/** Builds the provider-neutral order summary from the database. */
export async function orderSummary(orderId: string): Promise<OrderSummary & { accessToken: string; paid: number; advanceDue: number }> {
  const { data: o } = await createAdminClient().from("orders")
    .select("id,order_number,grand_total,paid_amount,advance_due,customer_name,phone,email,shipping_address,customer_note,payment_method,access_token,order_items(title,variant_title,quantity,unit_price)")
    .eq("id", orderId).single();
  if (!o) throw new Error("Order not found");
  const addr = o.shipping_address as Record<string, string>;
  const grand = Number(o.grand_total);
  return {
    id: o.id as string, orderNumber: o.order_number as string, grandTotal: grand, currency: "BDT",
    customer: { name: o.customer_name as string, phone: o.phone as string, email: (o.email as string) ?? undefined },
    shippingAddress: { name: o.customer_name as string, phone: o.phone as string, division: addr.division ?? "", district: addr.district ?? "", upazila: addr.upazila, addressLine: addr.address_line ?? "" },
    items: ((o.order_items as { title: string; variant_title: string | null; quantity: number; unit_price: number }[]) ?? [])
      .map((i) => ({ title: i.title, variant: i.variant_title ?? undefined, quantity: i.quantity, unitPrice: Number(i.unit_price) })),
    codAmount: Math.max(0, grand - Number(o.paid_amount)),
    note: (o.customer_note as string) ?? undefined,
    accessToken: o.access_token as string, paid: Number(o.paid_amount), advanceDue: Number(o.advance_due ?? 0),
  };
}

/** Starts an online payment for an order and records a pending payment row. Returns the gateway URL. */
export async function startOnlinePayment(orderId: string, method: Exclude<PaymentMethod, "cod">) {
  const summary = await orderSummary(orderId);
  // First payment of an advance order is the advance; otherwise the remaining balance
  const amount = summary.advanceDue > 0 && summary.paid === 0 ? summary.advanceDue : summary.grandTotal - summary.paid;
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const init = await providers[method].createPayment(summary, { amount, callbackBase: site });
  await createAdminClient().from("payments").insert({ order_id: orderId, gateway: method, amount, status: "pending", gateway_ref: init.gatewayRef ?? null });
  return init.redirectUrl;
}
