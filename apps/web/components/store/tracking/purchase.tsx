"use client";
import { useEffect } from "react";
import { track } from "@/lib/tracking/client";

/** Fires the purchase event once per order on this device (Pixel uses the order number as eventID for CAPI dedupe). */
export function PurchaseEvent({ order }: { order: { number: string; total: number; shipping: number; coupon: string | null; items: { id: string | null; title: string; price: number; quantity: number; variant: string | null }[] } }) {
  useEffect(() => {
    const key = `purchase_sent_${order.number}`;
    try { if (localStorage.getItem(key)) return; localStorage.setItem(key, "1"); } catch { /* ignore */ }
    const fire = () => track("purchase", {
      transaction_id: order.number, value: order.total, shipping: order.shipping, coupon: order.coupon ?? undefined,
      items: order.items.map((i) => ({ item_id: i.id ?? i.title, item_name: i.title, price: i.price, quantity: i.quantity, item_variant: i.variant })),
    });
    // Give consented tracking scripts a moment to load
    const id = setTimeout(fire, 1500);
    return () => clearTimeout(id);
  }, [order]);
  return null;
}
