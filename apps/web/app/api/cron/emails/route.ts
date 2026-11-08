import { NextResponse } from "next/server";
import { safeEqual } from "@/lib/security/crypto";
import { processEmailQueue, queueAbandonedCarts, queueStockAlerts } from "@/lib/email/worker";

export const maxDuration = 60;

/** Run every 5 to 15 minutes from cron-job.org with Authorization: Bearer CRON_SECRET. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!secret || !safeEqual(auth, secret)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const [carts, alerts] = await Promise.all([queueAbandonedCarts(), queueStockAlerts()]);
  const result = await processEmailQueue(40);
  return NextResponse.json({ abandoned: carts, stockAlerts: alerts, ...result });
}
