import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { orderSummary } from "@/lib/payments";
import type { CourierName } from "@/types/domain";
import type { CourierProvider, CourierStatus } from "./types";
import { steadfast } from "./steadfast";
import { pathao } from "./pathao";
import { redx } from "./redx";

export const couriers: Record<CourierName, CourierProvider> = { steadfast, pathao, redx };

export async function enabledCouriers(): Promise<CourierName[]> {
  const { data } = await createAdminClient().from("settings").select("key,value").in("key", ["courier.steadfast", "courier.pathao", "courier.redx"]);
  return (data ?? []).filter((r) => (r.value as { enabled?: boolean; enc?: string }).enabled && (r.value as { enc?: string }).enc)
    .map((r) => (r.key as string).split(".")[1] as CourierName);
}

/** Books a parcel for an order and moves it to "packed" (ready for pickup). */
export async function sendToCourier(orderId: string, courier: CourierName, actorId: string) {
  const admin = createAdminClient();
  const summary = await orderSummary(orderId);
  const { data: weights } = await admin.from("order_items").select("quantity,products(weight_grams),product_variants(weight_grams)").eq("order_id", orderId);
  summary.items = summary.items.map((it, i) => {
    const w = weights?.[i] as unknown as { products: { weight_grams: number | null } | null; product_variants: { weight_grams: number | null } | null } | undefined;
    return { ...it, weightGrams: w?.product_variants?.weight_grams ?? w?.products?.weight_grams ?? 500 };
  });
  const result = await couriers[courier].createConsignment(summary);
  await admin.from("shipments").insert({ order_id: orderId, courier, consignment_id: result.consignmentId, tracking_code: result.trackingCode, status: "booked", cod_amount: summary.codAmount, charge: result.charge ?? null, raw: result.raw as object });
  await admin.from("orders").update({ courier, consignment_id: result.consignmentId, tracking_code: result.trackingCode }).eq("id", orderId);
  await admin.rpc("set_order_status", { p_order: orderId, p_status: "packed", p_note: `Booked with ${courier}: ${result.trackingCode}`, p_actor: actorId, p_notify: false });
  return result;
}

/** Applies a courier status to the shipment and, when it maps, to the order. */
export async function applyCourierStatus(courier: CourierName, consignmentId: string, s: CourierStatus) {
  const admin = createAdminClient();
  const { data: ship } = await admin.from("shipments").select("id,order_id,status").eq("courier", courier).eq("consignment_id", consignmentId).maybeSingle();
  if (!ship) return false;
  if (ship.status !== s.courierStatus) await admin.from("shipments").update({ status: s.courierStatus, raw: s.raw as object, updated_at: new Date().toISOString() }).eq("id", ship.id);
  if (s.mappedStatus) {
    const { data: o } = await admin.from("orders").select("status").eq("id", ship.order_id).single();
    const order = ["pending", "confirmed", "processing", "packed", "shipped", "out_for_delivery", "delivered"];
    const forward = order.indexOf(s.mappedStatus) > order.indexOf(o?.status as string) || ["returned", "cancelled"].includes(s.mappedStatus);
    if (forward && o?.status !== s.mappedStatus) {
      await admin.rpc("set_order_status", { p_order: ship.order_id, p_status: s.mappedStatus, p_note: `${courier}: ${s.courierStatus}`, p_actor: null, p_notify: true });
    }
  }
  return true;
}
