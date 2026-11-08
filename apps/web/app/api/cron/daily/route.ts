import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSettingValue, saveSetting } from "@/lib/settings/server";
import { processEmailQueue } from "@/lib/email/worker";
import { safeEqual } from "@/lib/security/crypto";
import { buildBrain } from "@/lib/ai/brain";

/** Once a day (e.g. 9:00 Dhaka): low stock alert and yesterday's summary to the store email. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!secret || !safeEqual(auth, secret)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = createAdminClient();
  const store = await getSettingValue<{ email?: string }>("store");
  if (!store.email) return NextResponse.json({ skipped: "no store email" });

  // Yesterday in Dhaka time
  const dhakaNow = new Date(Date.now() + 6 * 3600000);
  const start = new Date(Date.UTC(dhakaNow.getUTCFullYear(), dhakaNow.getUTCMonth(), dhakaNow.getUTCDate() - 1) - 6 * 3600000);
  const end = new Date(start.getTime() + 86400000);
  const { data: orders } = await admin.from("orders").select("grand_total,status").gte("placed_at", start.toISOString()).lt("placed_at", end.toISOString());
  const ok = (orders ?? []).filter((o) => !["cancelled", "failed"].includes(o.status as string));
  await admin.from("email_queue").insert({ event: "admin_daily_summary", to_email: store.email, payload: { orders: ok.length, amount: ok.reduce((s, o) => s + Number(o.grand_total), 0), link: `${process.env.NEXT_PUBLIC_SITE_URL}/admin` } });

  // Low stock: alert once per product until it is restocked
  const alerted = new Set(((await getSettingValue<{ ids?: string[] }>("alerts.low_stock")).ids ?? []));
  const { data: low } = await admin.from("products").select("id,stock,low_stock_threshold").eq("status", "published").eq("track_inventory", true).limit(500);
  const lowNow = (low ?? []).filter((p) => (p.stock as number) <= (p.low_stock_threshold as number));
  const fresh = lowNow.filter((p) => !alerted.has(p.id as string)).slice(0, 10);
  for (const p of fresh) await admin.from("email_queue").insert({ event: "admin_low_stock", to_email: store.email, payload: { product_id: p.id } });
  await saveSetting("alerts.low_stock", { ids: lowNow.map((p) => p.id) });

  await buildBrain().catch(() => {});
  const sent = await processEmailQueue(20);
  return NextResponse.json({ summaryOrders: ok.length, lowStockAlerts: fresh.length, ...sent });
}
