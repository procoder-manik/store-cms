"use client";

/** Ecommerce events sent to GTM dataLayer, GA4 (gtag), Meta Pixel and TikTok when they are loaded. */
type Item = { item_id: string; item_name: string; price: number; quantity: number; item_variant?: string | null };
type W = Window & { dataLayer?: unknown[]; gtag?: (...a: unknown[]) => void; fbq?: (...a: unknown[]) => void; ttq?: { track: (e: string, d?: unknown) => void } };

const FB: Record<string, string> = { view_item: "ViewContent", add_to_cart: "AddToCart", begin_checkout: "InitiateCheckout", purchase: "Purchase", search: "Search", sign_up: "CompleteRegistration" };
const TT: Record<string, string> = { view_item: "ViewContent", add_to_cart: "AddToCart", begin_checkout: "InitiateCheckout", purchase: "CompletePayment", search: "Search" };

export function track(event: string, data: { value?: number; items?: Item[]; transaction_id?: string; search_term?: string; shipping?: number; coupon?: string } = {}) {
  if (typeof window === "undefined") return;
  const w = window as W;
  const payload = { currency: "BDT", ...data };
  w.dataLayer?.push({ ecommerce: null });
  w.dataLayer?.push({ event, ecommerce: payload });
  w.gtag?.("event", event, payload);
  const fb = FB[event];
  if (fb && w.fbq) {
    w.fbq("track", fb, {
      currency: "BDT", value: data.value, content_type: "product", content_ids: data.items?.map((i) => i.item_id),
      contents: data.items?.map((i) => ({ id: i.item_id, quantity: i.quantity })), search_string: data.search_term,
    }, data.transaction_id ? { eventID: data.transaction_id } : undefined);
  }
  if (event === "purchase" && w.gtag && data.transaction_id) {
    const adsId = (window as W & { __ads?: { id: string; label: string } }).__ads;
    if (adsId?.id && adsId.label) w.gtag("event", "conversion", { send_to: `${adsId.id}/${adsId.label}`, value: data.value, currency: "BDT", transaction_id: data.transaction_id });
  }
  const tt = TT[event];
  if (tt && w.ttq) w.ttq.track(tt, { currency: "BDT", value: data.value, contents: data.items?.map((i) => ({ content_id: i.item_id, quantity: i.quantity, price: i.price })) });
}
