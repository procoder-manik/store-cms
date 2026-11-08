import { NextResponse, type NextRequest } from "next/server";
import { bkash } from "@/lib/payments/bkash";
import { findPayment, orderUrl, settle } from "@/lib/payments/callback";

/** bKash redirects the customer here with ?paymentID=...&status=success|failure|cancel */
export async function GET(req: NextRequest) {
  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  const payment = params.paymentID ? await findPayment("bkash", params.paymentID) : null;
  if (!payment) return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/`);
  const v = await bkash.verifyPayment(params).catch((e) => ({ ok: false, raw: String(e), transactionId: undefined, amount: undefined }));
  const ok = await settle("bkash", payment.orderId, v.ok, v.transactionId, v.amount, v.raw);
  return NextResponse.redirect(orderUrl(payment.orderNumber, payment.token, ok ? "success" : "failed"));
}
