import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PaymentMethod } from "@/types/domain";

/** Finds the order behind a pending payment by its gateway reference. */
export async function findPayment(gateway: PaymentMethod, ref: string) {
  const { data } = await createAdminClient().from("payments")
    .select("id,order_id,amount,orders(order_number,access_token)").eq("gateway", gateway).eq("gateway_ref", ref)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!data) return null;
  const o = data.orders as unknown as { order_number: string; access_token: string };
  return { orderId: data.order_id as string, orderNumber: o.order_number, token: o.access_token };
}

export function orderUrl(orderNumber: string, token: string, payment: "success" | "failed") {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return `${site}/order/${orderNumber}?t=${token}&payment=${payment}`;
}

export async function settle(gateway: PaymentMethod, orderId: string, ok: boolean, trx: string | undefined, amount: number | undefined, raw: unknown) {
  const admin = createAdminClient();
  if (ok && trx && amount) {
    const { error } = await admin.rpc("mark_order_paid", { p_order: orderId, p_gateway: gateway, p_trx: trx, p_amount: amount, p_raw: raw });
    if (!error) return true;
    console.error("mark_order_paid failed", error.message);
  }
  await admin.rpc("mark_payment_failed", { p_order: orderId, p_gateway: gateway, p_raw: raw ?? {} });
  return false;
}
