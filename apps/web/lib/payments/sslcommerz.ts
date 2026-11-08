import "server-only";
import { getSecretSetting } from "@/lib/settings/server";
import type { OrderSummary } from "@/types/domain";
import type { PaymentProvider } from "./types";

type Pub = { enabled?: boolean; sandbox?: boolean };
type Sec = { store_id: string; store_password: string };

async function config() {
  const { public: p, secrets: s } = await getSecretSetting<Pub, Sec>("payment.sslcommerz");
  if (!p.enabled || !s.store_id || !s.store_password) throw new Error("SSLCommerz is not configured");
  const base = p.sandbox !== false ? "https://sandbox.sslcommerz.com" : "https://securepay.sslcommerz.com";
  return { base, storeId: s.store_id, password: s.store_password };
}

export const sslcommerz: PaymentProvider = {
  id: "sslcommerz",

  async createPayment(order: OrderSummary, { amount, callbackBase }) {
    const c = await config();
    const tran = `${order.orderNumber}-${Date.now().toString(36)}`;
    const body = new URLSearchParams({
      store_id: c.storeId, store_passwd: c.password, total_amount: amount.toFixed(2), currency: "BDT", tran_id: tran,
      success_url: `${callbackBase}/api/payments/sslcommerz/success`,
      fail_url: `${callbackBase}/api/payments/sslcommerz/fail`,
      cancel_url: `${callbackBase}/api/payments/sslcommerz/cancel`,
      ipn_url: `${callbackBase}/api/payments/sslcommerz/ipn`,
      cus_name: order.customer.name, cus_email: order.customer.email || "customer@example.com", cus_phone: order.customer.phone,
      cus_add1: order.shippingAddress.addressLine, cus_city: order.shippingAddress.district, cus_country: "Bangladesh",
      shipping_method: "NO", num_of_item: String(order.items.length),
      product_name: order.items.map((i) => i.title).join(", ").slice(0, 250), product_category: "general", product_profile: "general",
      value_a: order.id, value_b: order.orderNumber,
    });
    const res = await fetch(`${c.base}/gwprocess/v4/api.php`, { method: "POST", body, cache: "no-store" });
    const data = (await res.json()) as { status: string; GatewayPageURL?: string; failedreason?: string; sessionkey?: string };
    if (data.status !== "SUCCESS" || !data.GatewayPageURL) throw new Error(data.failedreason ?? "SSLCommerz session failed");
    return { redirectUrl: data.GatewayPageURL, gatewayRef: tran };
  },

  /** Never trust the redirect: always confirm with the validation API. */
  async verifyPayment(params) {
    const c = await config();
    if (!params.val_id) return { ok: false, raw: params };
    const url = `${c.base}/validator/api/validationserverAPI.php?val_id=${encodeURIComponent(params.val_id)}&store_id=${encodeURIComponent(c.storeId)}&store_passwd=${encodeURIComponent(c.password)}&format=json`;
    const res = await fetch(url, { cache: "no-store" });
    const data = (await res.json()) as { status: string; tran_id: string; amount: string; currency: string; bank_tran_id?: string; value_a?: string };
    const ok = (data.status === "VALID" || data.status === "VALIDATED") && data.currency === "BDT" && data.tran_id === params.tran_id;
    return { ok, transactionId: data.bank_tran_id || data.tran_id, amount: Number(data.amount), raw: data };
  },
};
