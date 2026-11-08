import "server-only";
import { createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSecretSetting, getSettingValue } from "@/lib/settings/server";

const h = (v: string) => createHash("sha256").update(v.trim().toLowerCase()).digest("hex");

/** Meta Conversions API Purchase event. event_id = order number so the browser Pixel event is de-duplicated. */
export async function sendMetaPurchase(orderId: string, ctx: { ip?: string | null; userAgent?: string | null; fbp?: string; fbc?: string }) {
  const tracking = await getSettingValue<{ enabled?: boolean; meta_pixel_id?: string }>("tracking");
  const { public: p, secrets } = await getSecretSetting<{ enabled?: boolean; test_event_code?: string }, { access_token: string }>("tracking.meta_capi");
  if (!tracking.meta_pixel_id || !p.enabled || !secrets.access_token) return;
  const { data: o } = await createAdminClient().from("orders").select("order_number,grand_total,email,phone,customer_name,shipping_address,placed_at,order_items(product_id,quantity,unit_price)").eq("id", orderId).single();
  if (!o) return;
  const phone = String(o.phone).replace(/\D/g, "").replace(/^0/, "880");
  const [fn, ...ln] = String(o.customer_name).split(" ");
  const body = {
    data: [{
      event_name: "Purchase", event_time: Math.floor(new Date(o.placed_at as string).getTime() / 1000), event_id: o.order_number, action_source: "website",
      event_source_url: `${process.env.NEXT_PUBLIC_SITE_URL}/checkout`,
      user_data: {
        ph: [h(phone)], ...(o.email && { em: [h(o.email as string)] }), fn: [h(fn ?? "")], ...(ln.length && { ln: [h(ln.join(" "))] }),
        ct: [h(((o.shipping_address as { district?: string }).district ?? "").replace(/\s/g, ""))], country: [h("bd")],
        client_ip_address: ctx.ip ?? undefined, client_user_agent: ctx.userAgent ?? undefined, fbp: ctx.fbp, fbc: ctx.fbc,
      },
      custom_data: {
        currency: "BDT", value: Number(o.grand_total), order_id: o.order_number, content_type: "product",
        contents: ((o.order_items as { product_id: string; quantity: number; unit_price: number }[]) ?? []).map((i) => ({ id: i.product_id, quantity: i.quantity, item_price: Number(i.unit_price) })),
      },
    }],
    ...(p.test_event_code && { test_event_code: p.test_event_code }),
  };
  const res = await fetch(`https://graph.facebook.com/v21.0/${tracking.meta_pixel_id}/events?access_token=${encodeURIComponent(secrets.access_token)}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  if (!res.ok) console.error("Meta CAPI", res.status, await res.text().catch(() => ""));
}
