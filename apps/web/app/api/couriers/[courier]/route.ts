import { NextResponse } from "next/server";
import { couriers, applyCourierStatus } from "@/lib/couriers";
import type { CourierName } from "@/types/domain";

/** Courier status webhooks: /api/couriers/steadfast | pathao | redx */
export async function POST(req: Request, { params }: { params: Promise<{ courier: string }> }) {
  const { courier } = await params;
  const provider = couriers[courier as CourierName];
  if (!provider?.handleWebhook) return NextResponse.json({ error: "unknown courier" }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const headers = new Headers(req.headers);
  headers.set("x-request-url", req.url);
  try {
    const s = await provider.handleWebhook(body, headers);
    if (s.consignmentId) await applyCourierStatus(courier as CourierName, s.consignmentId, s);
    const res = NextResponse.json({ ok: true }, { status: courier === "pathao" ? 202 : 200 });
    if (courier === "pathao") res.headers.set("X-Pathao-Merchant-Webhook-Integration-Secret", headers.get("x-pathao-signature") ?? "");
    return res;
  } catch (e) {
    const unauthorized = e instanceof Error && e.message === "unauthorized";
    return NextResponse.json({ error: unauthorized ? "unauthorized" : "failed" }, { status: unauthorized ? 401 : 500 });
  }
}
