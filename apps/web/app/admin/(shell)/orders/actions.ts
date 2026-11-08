"use server";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { processEmailQueue } from "@/lib/email/worker";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertPermission } from "@/lib/auth/rbac";
import { logAudit } from "@/lib/audit";
import { sendToCourier } from "@/lib/couriers";
import { providers } from "@/lib/payments";
import { bdPhone } from "@/lib/validators/auth";
import { ALL_DISTRICTS, divisionOf } from "@/lib/data/bd-locations";
import type { ActionResult } from "@/lib/actions/result";
import type { CourierName, OrderStatus } from "@/types/domain";

const STATUSES = ["pending", "confirmed", "processing", "packed", "shipped", "out_for_delivery", "delivered", "cancelled", "returned", "refunded", "failed"] as const;
const ids = z.array(z.string().uuid()).min(1).max(100);
const err = (e: unknown): ActionResult<never> => ({ ok: false, error: e instanceof Error ? e.message : "Failed" });

export async function updateOrderStatusAction(orderIds: string[], status: OrderStatus, note: string, notify: boolean): Promise<ActionResult> {
  try {
    const staff = await assertPermission("orders.update");
    const list = ids.parse(orderIds);
    if (!STATUSES.includes(status)) return { ok: false, error: "Invalid status" };
    const admin = createAdminClient();
    for (const id of list) {
      const { error } = await admin.rpc("set_order_status", { p_order: id, p_status: status, p_note: note.trim().slice(0, 500) || null, p_actor: staff.userId, p_notify: notify });
      if (error) return { ok: false, error: error.message };
    }
    await logAudit({ actorId: staff.userId, action: "order.status", entity: "orders", entityId: list.length === 1 ? list[0] : null, after: { ids: list, status, note } });
    after(() => processEmailQueue(10).catch(() => {}));
    revalidatePath("/admin/orders");
    return { ok: true };
  } catch (e) { return err(e); }
}

export async function saveAdminNoteAction(orderId: string, note: string): Promise<ActionResult> {
  try {
    const staff = await assertPermission("orders.update");
    await createAdminClient().from("orders").update({ admin_note: note.slice(0, 2000) }).eq("id", z.string().uuid().parse(orderId));
    await logAudit({ actorId: staff.userId, action: "order.note", entity: "orders", entityId: orderId });
    return { ok: true };
  } catch (e) { return err(e); }
}

export async function sendToCourierAction(orderIds: string[], courier: CourierName): Promise<ActionResult<{ done: number; errors: string[] }>> {
  try {
    const staff = await assertPermission("orders.update");
    const list = ids.parse(orderIds);
    const admin = createAdminClient();
    const errors: string[] = [];
    let done = 0;
    for (const id of list) {
      const { data: o } = await admin.from("orders").select("order_number,status,consignment_id").eq("id", id).single();
      if (!o) continue;
      if (o.consignment_id) { errors.push(`${o.order_number}: already booked`); continue; }
      if (["cancelled", "returned", "refunded", "failed", "delivered"].includes(o.status as string)) { errors.push(`${o.order_number}: status is ${o.status}`); continue; }
      try { await sendToCourier(id, courier, staff.userId); done++; } catch (e) { errors.push(`${o.order_number}: ${e instanceof Error ? e.message : "failed"}`); }
    }
    await logAudit({ actorId: staff.userId, action: "order.courier", entity: "orders", after: { ids: list, courier, done } });
    revalidatePath("/admin/orders");
    return { ok: true, data: { done, errors } };
  } catch (e) { return err(e); }
}

const refundSchema = z.object({ orderId: z.string().uuid(), amount: z.number().positive(), reason: z.string().trim().max(300), viaGateway: z.boolean() });
export async function refundAction(input: z.infer<typeof refundSchema>): Promise<ActionResult> {
  try {
    const staff = await assertPermission("orders.update");
    const d = refundSchema.parse(input);
    const admin = createAdminClient();
    const { data: o } = await admin.from("orders").select("paid_amount,grand_total,email").eq("id", d.orderId).single();
    if (!o) return { ok: false, error: "Order not found" };
    const { data: refunded } = await admin.from("refunds").select("amount").eq("order_id", d.orderId).eq("status", "completed");
    const already = (refunded ?? []).reduce((s, r) => s + Number(r.amount), 0);
    if (d.amount > Number(o.paid_amount) - already + 0.01) return { ok: false, error: "Refund is more than the amount paid." };

    const { data: pay } = await admin.from("payments").select("id,gateway,gateway_ref,transaction_id").eq("order_id", d.orderId).eq("status", "paid").order("created_at", { ascending: false }).limit(1).maybeSingle();
    let raw: unknown = null;
    if (d.viaGateway) {
      if (pay?.gateway !== "bkash" || !providers.bkash.refund) return { ok: false, error: "Automatic refund is available for bKash only. Refund manually and untick the option." };
      const r = await providers.bkash.refund(`${pay.gateway_ref}|${pay.transaction_id}`, d.amount, d.reason);
      raw = r.raw;
      if (!r.ok) return { ok: false, error: "bKash refused the refund. Check the payment in the bKash merchant panel." };
    }
    await admin.from("refunds").insert({ order_id: d.orderId, payment_id: pay?.id ?? null, amount: d.amount, reason: d.reason, status: "completed", raw: raw as object, actor_id: staff.userId });
    const full = already + d.amount >= Number(o.paid_amount) - 0.01;
    await admin.from("orders").update({ payment_status: full ? "refunded" : "partially_paid" }).eq("id", d.orderId);
    if (full) await admin.rpc("set_order_status", { p_order: d.orderId, p_status: "refunded", p_note: d.reason || "Refunded", p_actor: staff.userId, p_notify: true });
    await logAudit({ actorId: staff.userId, action: "order.refund", entity: "orders", entityId: d.orderId, after: d });
    revalidatePath(`/admin/orders/${d.orderId}`);
    return { ok: true };
  } catch (e) { return err(e); }
}

export interface OrderPick { productId: string; variantId: string | null; title: string; variant: string | null; price: number; stock: number; image: string | null }
export async function searchProductsForOrderAction(q: string): Promise<OrderPick[]> {
  await assertPermission("orders.create");
  const term = q.replace(/[%,()]/g, " ").trim();
  if (term.length < 2) return [];
  const { data } = await createAdminClient().from("products")
    .select("id,title,price,stock,product_variants(id,option_values,price,stock,is_active),product_media(url,sort_order)")
    .eq("status", "published").or(`title.ilike.%${term}%,sku.ilike.%${term}%`).limit(10);
  return (data ?? []).flatMap((p): OrderPick[] => {
    const img = ((p.product_media as { url: string; sort_order: number }[]) ?? []).sort((a, b) => a.sort_order - b.sort_order)[0]?.url ?? null;
    const vs = ((p.product_variants as { id: string; option_values: Record<string, string>; price: number; stock: number; is_active: boolean }[]) ?? []).filter((v) => v.is_active);
    if (!vs.length) return [{ productId: p.id as string, variantId: null, title: p.title as string, variant: null, price: Number(p.price), stock: p.stock as number, image: img }];
    return vs.map((v) => ({ productId: p.id as string, variantId: v.id, title: p.title as string, variant: Object.values(v.option_values).join(" / "), price: Number(v.price), stock: v.stock, image: img }));
  });
}

const manualSchema = z.object({
  items: z.array(z.object({ product_id: z.string().uuid(), variant_id: z.string().uuid().nullable(), quantity: z.number().int().min(1).max(99) })).min(1),
  name: z.string().trim().min(2), phone: bdPhone, email: z.string().email().or(z.literal("")),
  district: z.string().refine((d) => ALL_DISTRICTS.includes(d), "Choose a district"), upazila: z.string().optional().default(""),
  address: z.string().trim().min(5), note: z.string().optional().default(""), coupon: z.string().optional().default(""), confirm: z.boolean(),
});
export async function createManualOrderAction(input: z.input<typeof manualSchema>): Promise<ActionResult<{ id: string }>> {
  try {
    const staff = await assertPermission("orders.create");
    const parsed = manualSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form" };
    const d = parsed.data;
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("place_order", { p: {
      items: d.items, coupon_code: d.coupon, district: d.district, phone: d.phone, payment_method: "cod", source: "manual", note: d.note,
      customer: { name: d.name, phone: d.phone, email: d.email }, address: { division: divisionOf(d.district), district: d.district, upazila: d.upazila, address_line: d.address },
    } });
    if (error) return { ok: false, error: error.message.includes("stock") || error.message.includes("cart_error") ? "Not enough stock for one of the items." : error.message };
    const id = (data as { id: string }).id;
    if (d.confirm) await admin.rpc("set_order_status", { p_order: id, p_status: "confirmed", p_note: "Phone order", p_actor: staff.userId, p_notify: true });
    await logAudit({ actorId: staff.userId, action: "order.manual", entity: "orders", entityId: id });
    revalidatePath("/admin/orders");
    return { ok: true, data: { id } };
  } catch (e) { return err(e); }
}

export async function resolveReturnAction(returnId: string, approve: boolean, note: string): Promise<ActionResult> {
  try {
    const staff = await assertPermission("orders.update");
    const admin = createAdminClient();
    const { data: r } = await admin.from("returns").select("order_id,status,orders(email)").eq("id", returnId).single();
    if (!r || r.status !== "pending") return { ok: false, error: "Already handled" };
    await admin.from("returns").update({ status: approve ? "approved" : "rejected", admin_note: note || null }).eq("id", returnId);
    if (approve) await admin.rpc("set_order_status", { p_order: r.order_id, p_status: "returned", p_note: note || "Return approved", p_actor: staff.userId, p_notify: false });
    const email = (r.orders as unknown as { email: string | null } | null)?.email;
    if (email) await admin.from("email_queue").insert({ event: approve ? "return_approved" : "return_rejected", to_email: email, payload: { order_id: r.order_id, note } });
    await logAudit({ actorId: staff.userId, action: approve ? "return.approve" : "return.reject", entity: "returns", entityId: returnId });
    revalidatePath("/admin/orders/returns");
    return { ok: true };
  } catch (e) { return err(e); }
}
