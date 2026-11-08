import "server-only";
import { getSecretSetting } from "@/lib/settings/server";
import type { OrderStatus } from "@/types/domain";
import type { CourierProvider } from "./types";

type Pub = { enabled?: boolean; sandbox?: boolean; pickup_store_id?: string };
type Sec = { api_token: string; webhook_token: string };

async function cfg() {
  const { public: p, secrets: s } = await getSecretSetting<Pub, Sec>("courier.redx");
  if (!p.enabled || !s.api_token) throw new Error("RedX is not configured");
  return { base: p.sandbox !== false ? "https://sandbox.redx.com.bd/v1.0.0-beta" : "https://openapi.redx.com.bd/v1.0.0-beta", token: s.api_token, pickup: p.pickup_store_id };
}
async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const c = await cfg();
  const res = await fetch(`${c.base}${path}`, { ...init, cache: "no-store", headers: { "Content-Type": "application/json", "API-ACCESS-TOKEN": `Bearer ${c.token}` } });
  return (await res.json()) as T;
}

const MAP: Record<string, OrderStatus | null> = {
  "ready-for-delivery": "shipped", "delivery-in-progress": "out_for_delivery", delivered: "delivered",
  "agent-returning": null, returned: "returned", "agent-hold": null, "pickup-pending": null, "pickup-processing": null,
};

export const redx: CourierProvider = {
  id: "redx",
  async createConsignment(order) {
    const c = await cfg();
    const a = order.shippingAddress;
    const areas = await api<{ areas?: { id: number; name: string; district_name: string }[] }>(`/areas?district_name=${encodeURIComponent(a.district)}`);
    const list = areas.areas ?? [];
    const want = (a.upazila ?? "").toLowerCase();
    const area = (want && list.find((x) => x.name.toLowerCase().includes(want))) || list[0];
    if (!area) throw new Error(`RedX has no delivery area for ${a.district}`);
    const data = await api<{ tracking_id?: string; message?: string }>("/parcel", {
      method: "POST",
      body: JSON.stringify({
        customer_name: order.customer.name, customer_phone: order.customer.phone, delivery_area: area.name, delivery_area_id: area.id,
        customer_address: [a.addressLine, a.upazila, a.district].filter(Boolean).join(", "), merchant_invoice_id: order.orderNumber,
        cash_collection_amount: String(Math.round(order.codAmount)), parcel_weight: Math.max(500, order.items.reduce((s, i) => s + (i.weightGrams ?? 500) * i.quantity, 0)),
        instruction: order.note ?? "", value: String(Math.round(order.grandTotal)), ...(c.pickup ? { pickup_store_id: Number(c.pickup) } : {}),
        parcel_details_json: order.items.map((i) => ({ name: i.title.slice(0, 80), category: "general", value: i.unitPrice * i.quantity })),
      }),
    });
    if (!data.tracking_id) throw new Error(data.message ?? "RedX parcel failed");
    return { consignmentId: data.tracking_id, trackingCode: data.tracking_id, raw: data };
  },
  async getStatus(trackingId) {
    const data = await api<{ parcel?: { status?: string } }>(`/parcel/info/${encodeURIComponent(trackingId)}`);
    const s = data.parcel?.status ?? "unknown";
    return { courierStatus: s, mappedStatus: MAP[s] ?? null, raw: data };
  },
  async handleWebhook(body, hdrs) {
    const { secrets } = await getSecretSetting<Record<string, unknown>, Sec>("courier.redx");
    const url = new URL(hdrs.get("x-request-url") ?? "http://x");
    const token = hdrs.get("x-webhook-token") ?? url.searchParams.get("token");
    if (!secrets.webhook_token || token !== secrets.webhook_token) throw new Error("unauthorized");
    const b = body as { tracking_number?: string; status?: string };
    const s = b.status ?? "unknown";
    return { consignmentId: String(b.tracking_number ?? ""), courierStatus: s, mappedStatus: MAP[s] ?? null, raw: body };
  },
  trackingUrl: (code) => `https://redx.com.bd/track-global-parcel/?trackingId=${code}`,
};
