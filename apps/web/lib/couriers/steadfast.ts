import "server-only";
import { getSecretSetting } from "@/lib/settings/server";
import type { OrderStatus } from "@/types/domain";
import type { CourierProvider } from "./types";

type Sec = { api_key: string; secret_key: string; webhook_token: string };
const BASE = "https://portal.packzy.com/api/v1";

async function headers() {
  const { public: p, secrets: s } = await getSecretSetting<{ enabled?: boolean }, Sec>("courier.steadfast");
  if (!p.enabled || !s.api_key || !s.secret_key) throw new Error("Steadfast is not configured");
  return { "Api-Key": s.api_key, "Secret-Key": s.secret_key, "Content-Type": "application/json" };
}

const MAP: Record<string, OrderStatus | null> = {
  pending: null, in_review: null, hold: null, unknown: null,
  delivered: "delivered", partial_delivered: "delivered", delivered_approval_pending: "delivered", partial_delivered_approval_pending: "delivered",
  cancelled: "returned", cancelled_approval_pending: "returned",
};

export const steadfast: CourierProvider = {
  id: "steadfast",
  async createConsignment(order) {
    const a = order.shippingAddress;
    const res = await fetch(`${BASE}/create_order`, {
      method: "POST", headers: await headers(), cache: "no-store",
      body: JSON.stringify({
        invoice: order.orderNumber, recipient_name: order.customer.name, recipient_phone: order.customer.phone,
        recipient_address: [a.addressLine, a.upazila, a.district].filter(Boolean).join(", ").slice(0, 250),
        cod_amount: Math.round(order.codAmount), note: order.note?.slice(0, 200) ?? "",
      }),
    });
    const data = (await res.json()) as { status: number; message?: string; consignment?: { consignment_id: number; tracking_code: string } };
    if (data.status !== 200 || !data.consignment) throw new Error(data.message ?? "Steadfast order failed");
    return { consignmentId: String(data.consignment.consignment_id), trackingCode: data.consignment.tracking_code, raw: data };
  },
  async getStatus(consignmentId) {
    const res = await fetch(`${BASE}/status_by_cid/${encodeURIComponent(consignmentId)}`, { headers: await headers(), cache: "no-store" });
    const data = (await res.json()) as { delivery_status?: string };
    const s = data.delivery_status ?? "unknown";
    return { courierStatus: s, mappedStatus: MAP[s] ?? null, raw: data };
  },
  async handleWebhook(body, hdrs) {
    const { secrets } = await getSecretSetting<Record<string, unknown>, Sec>("courier.steadfast");
    const auth = hdrs.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!secrets.webhook_token || auth !== secrets.webhook_token) throw new Error("unauthorized");
    const b = body as { consignment_id?: number | string; status?: string; delivery_status?: string };
    const s = b.delivery_status ?? b.status ?? "unknown";
    return { consignmentId: String(b.consignment_id ?? ""), courierStatus: s, mappedStatus: MAP[s] ?? null, raw: body };
  },
  trackingUrl: (code) => `https://steadfast.com.bd/t/${code}`,
};
