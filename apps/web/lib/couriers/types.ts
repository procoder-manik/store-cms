import type { CourierName, OrderStatus, OrderSummary } from "@/types/domain";

export interface ConsignmentResult {
  consignmentId: string;
  trackingCode: string;
  charge?: number;
  raw: unknown;
}

export interface CourierStatus {
  courierStatus: string;
  mappedStatus: OrderStatus | null;
  raw: unknown;
}

/** Every courier (Steadfast, Pathao, RedX) implements this. */
export interface CourierProvider {
  id: CourierName;
  createConsignment(order: OrderSummary): Promise<ConsignmentResult>;
  getStatus(consignmentId: string): Promise<CourierStatus>;
  handleWebhook?(body: unknown, headers: Headers): Promise<{ consignmentId: string } & CourierStatus>;
  getRate?(input: { district: string; weightGrams: number; codAmount: number }): Promise<number>;
  trackingUrl(trackingCode: string): string;
}
