import { NextResponse } from "next/server";
import { sslcommerz } from "@/lib/payments/sslcommerz";
import { findPayment, orderUrl, settle } from "@/lib/payments/callback";

/** SSLCommerz posts form data to success, fail, cancel and ipn URLs. */
export async function POST(req: Request, { params }: { params: Promise<{ result: string }> }) {
  const { result } = await params;
  const form = Object.fromEntries((await req.formData()).entries()) as Record<string, string>;
  const tran = form.tran_id ?? "";
  const payment = tran ? await findPayment("sslcommerz", tran) : null;
  if (!payment) return result === "ipn" ? NextResponse.json({ ok: false }, { status: 404 }) : NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/`, 303);

  let ok = false;
  if (result === "success" || result === "ipn") {
    const v = await sslcommerz.verifyPayment(form).catch((e) => ({ ok: false, raw: String(e), transactionId: undefined, amount: undefined }));
    ok = await settle("sslcommerz", payment.orderId, v.ok, v.transactionId, v.amount, v.raw);
  } else {
    await settle("sslcommerz", payment.orderId, false, undefined, undefined, form);
  }
  if (result === "ipn") return NextResponse.json({ ok });
  return NextResponse.redirect(orderUrl(payment.orderNumber, payment.token, ok ? "success" : "failed"), 303);
}
