import type { OrderSummary, PaymentMethod } from "@/types/domain";

export interface PaymentInitResult {
  /** Where to send the customer (gateway page). Null for COD. */
  redirectUrl: string | null;
  gatewayRef?: string;
}

export interface PaymentVerification {
  ok: boolean;
  transactionId?: string;
  amount?: number;
  raw: unknown;
}

/** Every gateway (COD, SSLCommerz, bKash, later Nagad) implements this. */
export interface PaymentProvider {
  id: PaymentMethod;
  createPayment(order: OrderSummary, opts: { amount: number; callbackBase: string }): Promise<PaymentInitResult>;
  /** Server-side verification with the gateway. Never trust redirect params alone. */
  verifyPayment(params: Record<string, string>): Promise<PaymentVerification>;
  handleWebhook?(body: unknown, headers: Headers): Promise<PaymentVerification>;
  refund?(transactionId: string, amount: number, reason: string): Promise<{ ok: boolean; raw: unknown }>;
}
