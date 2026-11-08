import "server-only";
import { getSecretSetting } from "@/lib/settings/server";
import type { OrderSummary } from "@/types/domain";
import type { PaymentProvider } from "./types";

type Pub = { enabled?: boolean; sandbox?: boolean };
type Sec = { app_key: string; app_secret: string; username: string; password: string };

let tokenCache: { token: string; exp: number; base: string } | null = null;

async function config() {
  const { public: p, secrets: s } = await getSecretSetting<Pub, Sec>("payment.bkash");
  if (!p.enabled || !s.app_key || !s.app_secret || !s.username || !s.password) throw new Error("bKash is not configured");
  const base = p.sandbox !== false ? "https://tokenized.sandbox.bka.sh/v1.2.0-beta" : "https://tokenized.pay.bka.sh/v1.2.0-beta";
  return { base, ...(s as Sec) };
}

async function token() {
  const c = await config();
  if (tokenCache && tokenCache.base === c.base && tokenCache.exp > Date.now()) return { c, token: tokenCache.token };
  const res = await fetch(`${c.base}/tokenized/checkout/token/grant`, {
    method: "POST", cache: "no-store",
    headers: { "Content-Type": "application/json", Accept: "application/json", username: c.username, password: c.password },
    body: JSON.stringify({ app_key: c.app_key, app_secret: c.app_secret }),
  });
  const data = (await res.json()) as { id_token?: string; expires_in?: number; statusMessage?: string };
  if (!data.id_token) throw new Error(data.statusMessage ?? "bKash token failed");
  tokenCache = { token: data.id_token, exp: Date.now() + ((data.expires_in ?? 3600) - 120) * 1000, base: c.base };
  return { c, token: data.id_token };
}

async function call<T>(path: string, body: unknown): Promise<T> {
  const { c, token: t } = await token();
  const res = await fetch(`${c.base}${path}`, {
    method: "POST", cache: "no-store",
    headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: t, "X-App-Key": c.app_key },
    body: JSON.stringify(body),
  });
  return (await res.json()) as T;
}

type Exec = { statusCode?: string; statusMessage?: string; transactionStatus?: string; trxID?: string; amount?: string; paymentID?: string; merchantInvoiceNumber?: string };

export const bkash: PaymentProvider = {
  id: "bkash",

  async createPayment(order: OrderSummary, { amount, callbackBase }) {
    const data = await call<{ bkashURL?: string; paymentID?: string; statusMessage?: string }>("/tokenized/checkout/create", {
      mode: "0011", payerReference: order.customer.phone, callbackURL: `${callbackBase}/api/payments/bkash/callback`,
      amount: amount.toFixed(2), currency: "BDT", intent: "sale", merchantInvoiceNumber: order.orderNumber,
    });
    if (!data.bkashURL || !data.paymentID) throw new Error(data.statusMessage ?? "bKash create failed");
    return { redirectUrl: data.bkashURL, gatewayRef: data.paymentID };
  },

  /** Called from the callback with ?paymentID&status. Executes, and falls back to a status query. */
  async verifyPayment(params) {
    if (params.status !== "success" || !params.paymentID) return { ok: false, raw: params };
    let data = await call<Exec>("/tokenized/checkout/execute", { paymentID: params.paymentID });
    if (data.transactionStatus !== "Completed") {
      data = await call<Exec>("/tokenized/checkout/payment/status", { paymentID: params.paymentID });
    }
    return { ok: data.transactionStatus === "Completed", transactionId: data.trxID, amount: Number(data.amount ?? 0), raw: data };
  },

  async refund(paymentIdAndTrx: string, amount: number, reason: string) {
    const [paymentID, trxID] = paymentIdAndTrx.split("|");
    const data = await call<{ transactionStatus?: string; statusMessage?: string }>("/tokenized/checkout/payment/refund", {
      paymentID, trxID, amount: amount.toFixed(2), sku: "order", reason: reason.slice(0, 250) || "Refund",
    });
    return { ok: data.transactionStatus === "Completed", raw: data };
  },
};
