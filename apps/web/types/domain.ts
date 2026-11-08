/** Shared domain types used across storefront, admin and providers. */

export type OrderStatus =
  | "pending" | "confirmed" | "processing" | "packed" | "shipped"
  | "out_for_delivery" | "delivered" | "cancelled" | "returned" | "refunded" | "failed";

export type PaymentStatus = "unpaid" | "pending" | "paid" | "partially_paid" | "failed" | "refunded";
export type PaymentMethod = "cod" | "sslcommerz" | "bkash";
export type CourierName = "steadfast" | "pathao" | "redx";
export type SourcePlatform = "manual" | "temu" | "aliexpress" | "alibaba";

export interface Address {
  name: string;
  phone: string;
  email?: string;
  division: string;
  district: string;
  upazila?: string;
  area?: string;
  addressLine: string;
  postcode?: string;
}

export interface OrderSummary {
  id: string;
  orderNumber: string;
  grandTotal: number;
  currency: "BDT";
  customer: { name: string; phone: string; email?: string };
  shippingAddress: Address;
  items: { title: string; variant?: string; quantity: number; unitPrice: number; weightGrams?: number }[];
  codAmount: number;
  note?: string;
}
