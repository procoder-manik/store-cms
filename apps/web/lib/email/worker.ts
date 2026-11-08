import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildEmail } from "./templates";
import { resend } from "./resend";
import type { EmailEvent } from "./types";

const DAILY_LIMIT = Number(process.env.EMAIL_DAILY_LIMIT ?? 100);

/** Sends queued emails. Safe to call often: claims rows atomically, retries up to 5 times with backoff. */
export async function processEmailQueue(max = 20) {
  if (!process.env.RESEND_API_KEY) return { sent: 0, failed: 0, skipped: "no RESEND_API_KEY" };
  const admin = createAdminClient();
  const since = new Date(); since.setUTCHours(0, 0, 0, 0);
  const { count: today } = await admin.from("email_queue").select("*", { count: "exact", head: true }).eq("status", "sent").gte("sent_at", since.toISOString());
  const budget = Math.min(max, DAILY_LIMIT - (today ?? 0));
  if (budget <= 0) return { sent: 0, failed: 0, skipped: "daily limit reached" };

  const { data: rows } = await admin.from("email_queue").select("id,event,to_email,payload,attempts")
    .eq("status", "queued").lte("send_after", new Date().toISOString()).order("id").limit(budget);
  let sent = 0, failed = 0;
  for (const row of rows ?? []) {
    // Claim the row so parallel workers don't send twice
    const { data: claimed } = await admin.from("email_queue").update({ status: "sending" }).eq("id", row.id).eq("status", "queued").select("id");
    if (!claimed?.length) continue;
    try {
      if (!row.to_email) throw new Error("missing recipient");
      const email = await buildEmail(row.event as EmailEvent, (row.payload as Record<string, unknown>) ?? {}, row.to_email as string);
      if (!email) { await admin.from("email_queue").update({ status: "skipped" }).eq("id", row.id); continue; }
      const res = await resend.send({ to: row.to_email as string, ...email });
      await admin.from("email_queue").update({ status: "sent", sent_at: new Date().toISOString(), provider_id: res.id, attempts: (row.attempts as number) + 1, error: null }).eq("id", row.id);
      sent++;
    } catch (e) {
      const attempts = (row.attempts as number) + 1;
      await admin.from("email_queue").update({
        status: attempts >= 5 ? "failed" : "queued", attempts, error: e instanceof Error ? e.message.slice(0, 500) : "error",
        send_after: new Date(Date.now() + attempts * attempts * 60_000).toISOString(),
      }).eq("id", row.id);
      failed++;
    }
  }
  return { sent, failed };
}

/** Queues 1h and 24h reminders for idle carts that have items and a known email. */
export async function queueAbandonedCarts() {
  const admin = createAdminClient();
  const now = Date.now();
  const { data: carts } = await admin.from("carts")
    .select("id,email,name,user_id,recovery_stage,last_activity_at,cart_items(id),profiles(email,full_name,marketing_opt_in)")
    .is("recovered_order_id", null).lt("recovery_stage", 2).lt("last_activity_at", new Date(now - 3600_000).toISOString())
    .gt("last_activity_at", new Date(now - 7 * 86400_000).toISOString()).limit(200);
  let queued = 0;
  for (const c of carts ?? []) {
    if (!(c.cart_items as unknown[])?.length) continue;
    const p = c.profiles as unknown as { email: string | null; full_name: string | null } | null;
    const email = (c.email as string) || p?.email;
    if (!email) continue;
    const idleH = (now - new Date(c.last_activity_at as string).getTime()) / 3600_000;
    const stage = c.recovery_stage as number;
    const event = stage === 0 ? "abandoned_cart_1h" : idleH >= 24 ? "abandoned_cart_24h" : null;
    if (!event) continue;
    await admin.from("email_queue").insert({ event, to_email: email, payload: { name: (c.name as string) ?? p?.full_name ?? "" } });
    await admin.from("carts").update({ recovery_stage: stage + 1 }).eq("id", c.id);
    queued++;
  }
  return queued;
}

/** Notifies customers who asked for back-in-stock alerts. */
export async function queueStockAlerts() {
  const admin = createAdminClient();
  const { data } = await admin.from("stock_alerts")
    .select("id,email,product_id,variant_id,products(stock,status),product_variants(stock)").is("notified_at", null).limit(200);
  let queued = 0;
  for (const a of data ?? []) {
    const prod = a.products as unknown as { stock: number; status: string } | null;
    const v = a.product_variants as unknown as { stock: number } | null;
    const stock = v ? v.stock : prod?.stock ?? 0;
    if (prod?.status !== "published" || stock <= 0) continue;
    await admin.from("email_queue").insert({ event: "back_in_stock", to_email: a.email, payload: { product_id: a.product_id } });
    await admin.from("stock_alerts").update({ notified_at: new Date().toISOString() }).eq("id", a.id);
    queued++;
  }
  return queued;
}
