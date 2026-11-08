import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { couriers, applyCourierStatus } from "@/lib/couriers";
import { safeEqual } from "@/lib/security/crypto";
import type { CourierName } from "@/types/domain";

/** Polls open shipments (backup for missed webhooks). Call with header Authorization: Bearer CRON_SECRET. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!secret || !safeEqual(auth, secret)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data } = await createAdminClient().from("shipments").select("courier,consignment_id,orders!inner(status)")
    .not("orders.status", "in", "(delivered,cancelled,returned,refunded,failed)").order("updated_at").limit(80);
  let updated = 0;
  for (const s of data ?? []) {
    try {
      const st = await couriers[s.courier as CourierName].getStatus(s.consignment_id as string);
      if (await applyCourierStatus(s.courier as CourierName, s.consignment_id as string, st)) updated++;
    } catch (e) { console.error("courier sync", s.courier, e); }
  }
  return NextResponse.json({ checked: data?.length ?? 0, updated });
}
