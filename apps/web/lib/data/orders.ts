import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export interface OrderView {
  id: string; order_number: string; status: string; payment_status: string; payment_method: string;
  customer_name: string; phone: string; email: string | null;
  subtotal: number; discount_total: number; shipping_total: number; grand_total: number; coupon_code: string | null;
  shipping_address: { district?: string; upazila?: string; address_line?: string; division?: string };
  courier: string | null; tracking_code: string | null; placed_at: string; access_token: string; user_id: string | null; customer_note: string | null; paid_amount: number; advance_due: number; custom_fields: Record<string, string>;
  items: { id: string; title: string; variant_title: string | null; sku: string | null; image_url: string | null; unit_price: number; quantity: number; total: number; product_id: string | null }[];
  history: { to_status: string; created_at: string }[];
}

/** Loads an order for the customer view. Caller must verify ownership (user id or access token). */
export async function getOrder(orderNumber: string): Promise<OrderView | null> {
  const { data } = await createAdminClient().from("orders")
    .select("*, order_items(id,title,variant_title,sku,image_url,unit_price,quantity,total,product_id), order_status_history(to_status,created_at)")
    .eq("order_number", orderNumber.toUpperCase()).maybeSingle();
  if (!data) return null;
  const r = data as Record<string, unknown>;
  return {
    ...(r as unknown as OrderView),
    subtotal: Number(r.subtotal), paid_amount: Number(r.paid_amount ?? 0), advance_due: Number(r.advance_due ?? 0), custom_fields: (r.custom_fields as Record<string, string>) ?? {}, discount_total: Number(r.discount_total), shipping_total: Number(r.shipping_total), grand_total: Number(r.grand_total),
    items: ((r.order_items as OrderView["items"]) ?? []).map((i) => ({ ...i, unit_price: Number(i.unit_price), total: Number(i.total) })),
    history: ((r.order_status_history as OrderView["history"]) ?? []).sort((a, b) => a.created_at.localeCompare(b.created_at)),
  };
}
