import "server-only";
import { getSecretSetting } from "@/lib/settings/server";
import type { OrderStatus } from "@/types/domain";
import type { CourierProvider } from "./types";

type Pub = { enabled?: boolean; sandbox?: boolean; store_id?: string };
type Sec = { client_id: string; client_secret: string; username: string; password: string; webhook_secret: string };
let cache: { token: string; exp: number; base: string } | null = null;

async function cfg() {
  const { public: p, secrets: s } = await getSecretSetting<Pub, Sec>("courier.pathao");
  if (!p.enabled || !s.client_id || !s.client_secret || !s.username || !s.password || !p.store_id) throw new Error("Pathao is not configured");
  return { base: p.sandbox !== false ? "https://courier-api-sandbox.pathao.com" : "https://api-hermes.pathao.com", storeId: Number(p.store_id), ...(s as Sec) };
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const c = await cfg();
  if (!cache || cache.base !== c.base || cache.exp < Date.now()) {
    const r = await fetch(`${c.base}/aladdin/api/v1/issue-token`, {
      method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store",
      body: JSON.stringify({ client_id: c.client_id, client_secret: c.client_secret, username: c.username, password: c.password, grant_type: "password" }),
    });
    const d = (await r.json()) as { access_token?: string; expires_in?: number; message?: string };
    if (!d.access_token) throw new Error(d.message ?? "Pathao auth failed");
    cache = { token: d.access_token, exp: Date.now() + ((d.expires_in ?? 3600) - 300) * 1000, base: c.base };
  }
  const res = await fetch(`${c.base}${path}`, { ...init, cache: "no-store", headers: { "Content-Type": "application/json", Authorization: `Bearer ${cache.token}`, ...(init?.headers ?? {}) } });
  return (await res.json()) as T;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
const ALIAS: Record<string, string> = { chattogram: "chittagong", cumilla: "comilla", bogura: "bogra", jashore: "jessore", barishal: "barisal", coxsbazar: "coxsbazar" };

/** Maps our district and area text to Pathao's city and zone ids. */
async function cityZone(district: string, area?: string) {
  const cities = await api<{ data: { data: { city_id: number; city_name: string }[] } }>("/aladdin/api/v1/city-list");
  const want = ALIAS[norm(district)] ?? norm(district);
  const city = cities.data.data.find((c) => norm(c.city_name) === want) ?? cities.data.data.find((c) => norm(c.city_name).includes(want));
  if (!city) throw new Error(`Pathao has no city for ${district}`);
  const zones = await api<{ data: { data: { zone_id: number; zone_name: string }[] } }>(`/aladdin/api/v1/cities/${city.city_id}/zone-list`);
  const a = area ? norm(area) : "";
  const zone = (a && zones.data.data.find((z) => norm(z.zone_name).includes(a) || a.includes(norm(z.zone_name)))) || zones.data.data[0];
  if (!zone) throw new Error("Pathao zone not found");
  return { city: city.city_id, zone: zone.zone_id };
}

const MAP: Record<string, OrderStatus | null> = {
  Pickup_Requested: null, Assigned_for_Pickup: null, Picked: "shipped", In_Transit: "shipped", Received_at_Last_Mile_Hub: "shipped",
  Assigned_for_Delivery: "out_for_delivery", Delivered: "delivered", Partial_Delivery: "delivered",
  Return: "returned", Returned: "returned", Delivery_Failed: null, On_Hold: null, Pickup_Cancelled: "cancelled",
};
const mapStatus = (s: string) => MAP[s.replace(/[\s-]+/g, "_")] ?? (s.toLowerCase().includes("deliver") && !s.toLowerCase().includes("fail") ? "delivered" : null);

export const pathao: CourierProvider = {
  id: "pathao",
  async createConsignment(order) {
    const c = await cfg();
    const a = order.shippingAddress;
    const { city, zone } = await cityZone(a.district, a.upazila);
    const data = await api<{ code?: number; message?: string; data?: { consignment_id: string; delivery_fee?: number } }>("/aladdin/api/v1/orders", {
      method: "POST",
      body: JSON.stringify({
        store_id: c.storeId, merchant_order_id: order.orderNumber, recipient_name: order.customer.name, recipient_phone: order.customer.phone,
        recipient_address: [a.addressLine, a.upazila, a.district].filter(Boolean).join(", ").slice(0, 220), recipient_city: city, recipient_zone: zone,
        delivery_type: 48, item_type: 2, special_instruction: order.note?.slice(0, 200) ?? "", item_quantity: order.items.reduce((s, i) => s + i.quantity, 0),
        item_weight: Math.max(0.5, Math.round((order.items.reduce((s, i) => s + (i.weightGrams ?? 500) * i.quantity, 0) / 1000) * 10) / 10),
        amount_to_collect: Math.round(order.codAmount), item_description: order.items.map((i) => i.title).join(", ").slice(0, 200),
      }),
    });
    if (!data.data?.consignment_id) throw new Error(data.message ?? "Pathao order failed");
    return { consignmentId: data.data.consignment_id, trackingCode: data.data.consignment_id, charge: data.data.delivery_fee, raw: data };
  },
  async getStatus(consignmentId) {
    const data = await api<{ data?: { order_status?: string } }>(`/aladdin/api/v1/orders/${encodeURIComponent(consignmentId)}/info`);
    const s = data.data?.order_status ?? "unknown";
    return { courierStatus: s, mappedStatus: mapStatus(s), raw: data };
  },
  async handleWebhook(body, hdrs) {
    const { secrets } = await getSecretSetting<Record<string, unknown>, Sec>("courier.pathao");
    const sig = hdrs.get("x-pathao-signature") ?? hdrs.get("x-pathao-merchant-webhook-integration-secret");
    if (!secrets.webhook_secret || sig !== secrets.webhook_secret) throw new Error("unauthorized");
    const b = body as { consignment_id?: string; order_status?: string; event?: string };
    const s = b.order_status ?? b.event ?? "unknown";
    return { consignmentId: String(b.consignment_id ?? ""), courierStatus: s, mappedStatus: mapStatus(s), raw: body };
  },
  trackingUrl: (code) => `https://merchant.pathao.com/tracking?consignment_id=${code}`,
};
