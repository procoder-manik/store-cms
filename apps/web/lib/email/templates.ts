import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSettingValue } from "@/lib/settings/server";
import { formatBDT } from "@/lib/utils";
import type { EmailEvent } from "./types";
import { PALETTES, resolveAppearance, type Appearance } from "@/lib/theme/presets";

type Lang = "en" | "bn";
type Ctx = Record<string, string>;
const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const fill = (s: string, ctx: Ctx) => s.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => esc(ctx[k] ?? ""));

/** Default copy per event. {{name}}, {{order}}, {{store}} etc. are filled from context. Editable in Admin > Emails. */
export const DEFAULTS: Record<EmailEvent, Record<Lang, { subject: string; heading: string; body: string; cta?: string }>> = {
  welcome: { en: { subject: "Welcome to {{store}}", heading: "Welcome, {{name}}", body: "Your account is ready. Save addresses, track orders and get member offers.", cta: "Start shopping" }, bn: { subject: "{{store}}-এ স্বাগতম", heading: "স্বাগতম, {{name}}", body: "আপনার অ্যাকাউন্ট তৈরি হয়েছে। ঠিকানা সেভ করুন, অর্ডার ট্র্যাক করুন, মেম্বার অফার পান।", cta: "কেনাকাটা শুরু করুন" } },
  verify_email: { en: { subject: "Confirm your email", heading: "Confirm your email", body: "Tap the button to confirm your email address.", cta: "Confirm email" }, bn: { subject: "ইমেল কনফার্ম করুন", heading: "ইমেল কনফার্ম করুন", body: "ইমেল কনফার্ম করতে বাটনে চাপ দিন।", cta: "কনফার্ম" } },
  password_reset: { en: { subject: "Reset your password", heading: "Reset your password", body: "Tap the button to choose a new password. If you did not ask for this, ignore this email.", cta: "Reset password" }, bn: { subject: "পাসওয়ার্ড রিসেট", heading: "পাসওয়ার্ড রিসেট", body: "নতুন পাসওয়ার্ড দিতে বাটনে চাপ দিন। আপনি না চাইলে এই ইমেল উপেক্ষা করুন।", cta: "রিসেট করুন" } },
  password_changed: { en: { subject: "Your password was changed", heading: "Password changed", body: "Your password was just changed. If this was not you, reset it now and contact us." }, bn: { subject: "পাসওয়ার্ড বদলানো হয়েছে", heading: "পাসওয়ার্ড বদলানো হয়েছে", body: "আপনার পাসওয়ার্ড এইমাত্র বদলানো হয়েছে। আপনি না করলে এখনই রিসেট করে আমাদের জানান।" } },
  new_login: { en: { subject: "New sign-in to your account", heading: "New sign-in", body: "We noticed a new sign-in to your account." }, bn: { subject: "নতুন সাইন ইন", heading: "নতুন সাইন ইন", body: "আপনার অ্যাকাউন্টে নতুন সাইন ইন হয়েছে।" } },
  order_placed: { en: { subject: "Order {{order}} received", heading: "Thanks for your order, {{name}}", body: "We have received order {{order}}. We will call you to confirm before sending it.", cta: "View order" }, bn: { subject: "অর্ডার {{order}} পাওয়া গেছে", heading: "অর্ডারের জন্য ধন্যবাদ, {{name}}", body: "আপনার অর্ডার {{order}} পেয়েছি। পাঠানোর আগে ফোনে কনফার্ম করব।", cta: "অর্ডার দেখুন" } },
  payment_received: { en: { subject: "Payment received for {{order}}", heading: "Payment received", body: "We received {{amount}} for order {{order}}.", cta: "View order" }, bn: { subject: "{{order}} এর পেমেন্ট পাওয়া গেছে", heading: "পেমেন্ট পাওয়া গেছে", body: "অর্ডার {{order}} এর জন্য {{amount}} পেয়েছি।", cta: "অর্ডার দেখুন" } },
  payment_failed: { en: { subject: "Payment for {{order}} did not go through", heading: "Payment not completed", body: "Your items are reserved. You can try again or switch to cash on delivery.", cta: "Complete order" }, bn: { subject: "{{order}} এর পেমেন্ট সম্পন্ন হয়নি", heading: "পেমেন্ট সম্পন্ন হয়নি", body: "আপনার পণ্য রাখা আছে। আবার চেষ্টা করুন অথবা ক্যাশ অন ডেলিভারি বেছে নিন।", cta: "অর্ডার সম্পন্ন করুন" } },
  order_confirmed: { en: { subject: "Order {{order}} confirmed", heading: "Your order is confirmed", body: "We are preparing order {{order}}. {{note}}", cta: "Track order" }, bn: { subject: "অর্ডার {{order}} কনফার্মড", heading: "অর্ডার কনফার্ম হয়েছে", body: "অর্ডার {{order}} প্রস্তুত করা হচ্ছে। {{note}}", cta: "ট্র্যাক করুন" } },
  order_processing: { en: { subject: "Order {{order}} is being packed", heading: "Packing your order", body: "Order {{order}} is being packed and will be handed to the courier soon.", cta: "Track order" }, bn: { subject: "অর্ডার {{order}} প্যাক হচ্ছে", heading: "অর্ডার প্যাক হচ্ছে", body: "অর্ডার {{order}} প্যাক হচ্ছে, শীঘ্রই কুরিয়ারে দেওয়া হবে।", cta: "ট্র্যাক করুন" } },
  order_shipped: { en: { subject: "Order {{order}} is on its way", heading: "Your order is on its way", body: "Order {{order}} was handed to {{courier}}. Tracking: {{tracking}}", cta: "Track order" }, bn: { subject: "অর্ডার {{order}} পাঠানো হয়েছে", heading: "অর্ডার পথে আছে", body: "অর্ডার {{order}} {{courier}}-এ দেওয়া হয়েছে। ট্র্যাকিং: {{tracking}}", cta: "ট্র্যাক করুন" } },
  out_for_delivery: { en: { subject: "Order {{order}} arrives today", heading: "Out for delivery", body: "The rider is on the way with order {{order}}. Please keep {{cod}} ready if paying cash.", cta: "Track order" }, bn: { subject: "অর্ডার {{order}} আজ পৌঁছাবে", heading: "ডেলিভারির পথে", body: "রাইডার অর্ডার {{order}} নিয়ে আসছেন। ক্যাশে দিলে {{cod}} প্রস্তুত রাখুন।", cta: "ট্র্যাক করুন" } },
  order_delivered: { en: { subject: "Order {{order}} delivered", heading: "Delivered. Enjoy!", body: "How was it? A quick review helps other shoppers.", cta: "Write a review" }, bn: { subject: "অর্ডার {{order}} ডেলিভারি হয়েছে", heading: "ডেলিভারি হয়েছে", body: "কেমন লাগলো? একটা রিভিউ অন্যদের সাহায্য করবে।", cta: "রিভিউ লিখুন" } },
  order_cancelled: { en: { subject: "Order {{order}} cancelled", heading: "Order cancelled", body: "Order {{order}} has been cancelled. {{note}}", cta: "Continue shopping" }, bn: { subject: "অর্ডার {{order}} বাতিল", heading: "অর্ডার বাতিল হয়েছে", body: "অর্ডার {{order}} বাতিল হয়েছে। {{note}}", cta: "কেনাকাটা চালিয়ে যান" } },
  return_received: { en: { subject: "Return request for {{order}}", heading: "We got your return request", body: "We will review it and contact you." }, bn: { subject: "{{order}} এর রিটার্ন অনুরোধ", heading: "রিটার্ন অনুরোধ পেয়েছি", body: "আমরা দেখে যোগাযোগ করব।" } },
  return_approved: { en: { subject: "Return approved for {{order}}", heading: "Return approved", body: "{{note}} Our courier will collect the item." }, bn: { subject: "{{order}} এর রিটার্ন অনুমোদিত", heading: "রিটার্ন অনুমোদিত", body: "{{note}} আমাদের কুরিয়ার পণ্যটি নিয়ে আসবে।" } },
  return_rejected: { en: { subject: "About your return for {{order}}", heading: "Return not approved", body: "{{note}} Reply to this email if you have questions." }, bn: { subject: "{{order}} এর রিটার্ন", heading: "রিটার্ন অনুমোদিত হয়নি", body: "{{note}} প্রশ্ন থাকলে এই ইমেলে উত্তর দিন।" } },
  refund_processed: { en: { subject: "Refund for {{order}}", heading: "Refund processed", body: "Your refund for order {{order}} has been processed.", cta: "View order" }, bn: { subject: "{{order}} এর টাকা ফেরত", heading: "টাকা ফেরত দেওয়া হয়েছে", body: "অর্ডার {{order}} এর টাকা ফেরত দেওয়া হয়েছে।", cta: "অর্ডার দেখুন" } },
  abandoned_cart_1h: { en: { subject: "You left something in your cart", heading: "Still thinking it over?", body: "Your cart is saved. Finish your order before items sell out.", cta: "Return to cart" }, bn: { subject: "কার্টে কিছু রয়ে গেছে", heading: "এখনো ভাবছেন?", body: "আপনার কার্ট সেভ আছে। স্টক শেষ হওয়ার আগে অর্ডার করুন।", cta: "কার্টে ফিরুন" } },
  abandoned_cart_24h: { en: { subject: "Your cart is waiting", heading: "Your picks are waiting", body: "Cash on delivery everywhere in Bangladesh. Complete your order in a minute.", cta: "Complete order" }, bn: { subject: "আপনার কার্ট অপেক্ষা করছে", heading: "আপনার পছন্দের জিনিস অপেক্ষায়", body: "সারা দেশে ক্যাশ অন ডেলিভারি। এক মিনিটে অর্ডার শেষ করুন।", cta: "অর্ডার করুন" } },
  back_in_stock: { en: { subject: "{{product}} is back in stock", heading: "It's back", body: "{{product}} is available again. Stock is limited.", cta: "Buy now" }, bn: { subject: "{{product}} আবার স্টকে", heading: "আবার এসেছে", body: "{{product}} আবার পাওয়া যাচ্ছে। স্টক সীমিত।", cta: "এখনই কিনুন" } },
  price_drop: { en: { subject: "Price drop on {{product}}", heading: "Price dropped", body: "{{product}} on your wishlist is now {{amount}}.", cta: "View product" }, bn: { subject: "{{product}} এর দাম কমেছে", heading: "দাম কমেছে", body: "আপনার উইশলিস্টের {{product}} এখন {{amount}}।", cta: "দেখুন" } },
  newsletter_confirm: { en: { subject: "Confirm your subscription", heading: "One more step", body: "Confirm to start getting new arrivals and members-only deals.", cta: "Confirm subscription" }, bn: { subject: "সাবস্ক্রিপশন কনফার্ম করুন", heading: "আর একটা ধাপ", body: "নতুন পণ্য ও মেম্বার অফার পেতে কনফার্ম করুন।", cta: "কনফার্ম করুন" } },
  loyalty_points: { en: { subject: "You earned points", heading: "You earned {{points}} points", body: "Use them on your next order." }, bn: { subject: "পয়েন্ট পেয়েছেন", heading: "{{points}} পয়েন্ট পেয়েছেন", body: "পরের অর্ডারে ব্যবহার করুন।" } },
  contact_autoreply: { en: { subject: "We got your message", heading: "Thanks, {{name}}", body: "We received your message and will reply within one working day." }, bn: { subject: "আপনার মেসেজ পেয়েছি", heading: "ধন্যবাদ, {{name}}", body: "আপনার মেসেজ পেয়েছি, এক কর্মদিবসের মধ্যে উত্তর দেব।" } },
  account_deleted: { en: { subject: "Your account was deleted", heading: "Account deleted", body: "Your account and personal data have been removed." }, bn: { subject: "অ্যাকাউন্ট মুছে ফেলা হয়েছে", heading: "অ্যাকাউন্ট মুছে ফেলা হয়েছে", body: "আপনার অ্যাকাউন্ট ও ব্যক্তিগত তথ্য মুছে ফেলা হয়েছে।" } },
  admin_new_order: { en: { subject: "New order {{order}} · {{amount}}", heading: "New order {{order}}", body: "{{name}} ({{phone}}) ordered {{amount}} for delivery to {{district}}.", cta: "Open in Admin" }, bn: { subject: "নতুন অর্ডার {{order}}", heading: "নতুন অর্ডার {{order}}", body: "{{name}} ({{phone}}) {{amount}} এর অর্ডার দিয়েছেন, ডেলিভারি {{district}}।", cta: "অ্যাডমিনে দেখুন" } },
  admin_low_stock: { en: { subject: "Low stock: {{product}}", heading: "Low stock", body: "{{product}} has {{stock}} left.", cta: "Open product" }, bn: { subject: "স্টক কম: {{product}}", heading: "স্টক কম", body: "{{product}} মাত্র {{stock}}টি আছে।", cta: "প্রোডাক্ট খুলুন" } },
  admin_review_pending: { en: { subject: "New review waiting", heading: "A review needs approval", body: "A customer reviewed {{product}}.", cta: "Open reviews" }, bn: { subject: "নতুন রিভিউ", heading: "রিভিউ অনুমোদন দরকার", body: "{{product}} এ নতুন রিভিউ এসেছে।", cta: "রিভিউ দেখুন" } },
  admin_return_request: { en: { subject: "Return request for {{order}}", heading: "Return request", body: "{{name}} asked to return items from {{order}}.", cta: "Open returns" }, bn: { subject: "{{order}} এর রিটার্ন অনুরোধ", heading: "রিটার্ন অনুরোধ", body: "{{name}} {{order}} থেকে পণ্য ফেরত দিতে চান।", cta: "রিটার্ন দেখুন" } },
  staff_invite: { en: { subject: "You're invited to {{store}} Admin", heading: "Welcome to the team, {{name}}", body: "Use this one-time link to set your password. It works once.", cta: "Accept invite" }, bn: { subject: "{{store}} অ্যাডমিনে আমন্ত্রণ", heading: "টিমে স্বাগতম, {{name}}", body: "পাসওয়ার্ড সেট করতে এই এককালীন লিংক ব্যবহার করুন।", cta: "আমন্ত্রণ গ্রহণ" } },
  admin_integration_error: { en: { subject: "Integration problem", heading: "Something needs attention", body: "{{note}}" }, bn: { subject: "ইন্টিগ্রেশন সমস্যা", heading: "মনোযোগ দরকার", body: "{{note}}" } },
  admin_daily_summary: { en: { subject: "Yesterday: {{orders}} orders, {{amount}}", heading: "Daily summary", body: "{{orders}} orders worth {{amount}}.", cta: "Open dashboard" }, bn: { subject: "গতকাল: {{orders}} অর্ডার, {{amount}}", heading: "দৈনিক সারাংশ", body: "{{orders}}টি অর্ডার, মোট {{amount}}।", cta: "ড্যাশবোর্ড" } },
};

const ADMIN_EVENTS = new Set(["admin_new_order", "admin_low_stock", "admin_review_pending", "admin_return_request", "admin_integration_error", "admin_daily_summary"]);

function layout(opts: { store: string; heading: string; body: string; cta?: string; url?: string; extra?: string; lang: Lang; logo?: string | null; accent: string }) {
  const font = opts.lang === "bn" ? "'Hind Siliguri','Noto Sans Bengali',sans-serif" : "-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Helvetica,Arial,sans-serif";
  return `<!doctype html><html lang="${opts.lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><title>${esc(opts.heading)}</title></head>
<body style="margin:0;background:#f5f5f7;font-family:${font};color:#1d1d1f">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
<tr><td style="padding:0 8px 20px;font-size:20px;font-weight:600;letter-spacing:-0.02em">${opts.logo ? `<img src="${esc(opts.logo)}" alt="${esc(opts.store)}" height="28">` : esc(opts.store)}</td></tr>
<tr><td style="background:#ffffff;border-radius:22px;padding:32px 28px">
<h1 style="margin:0 0 12px;font-size:26px;line-height:1.2;letter-spacing:-0.02em;font-weight:600">${opts.heading}</h1>
<p style="margin:0;font-size:16px;line-height:1.6;color:#424245">${opts.body}</p>
${opts.extra ?? ""}
${opts.cta && opts.url ? `<p style="margin:28px 0 0"><a href="${esc(opts.url)}" style="display:inline-block;background:${opts.accent};color:#ffffff;text-decoration:none;font-size:15px;font-weight:500;padding:12px 24px;border-radius:999px">${esc(opts.cta)}</a></p>` : ""}
</td></tr>
<tr><td style="padding:20px 8px;font-size:12px;color:#86868b;line-height:1.5">${esc(opts.store)} · Bangladesh</td></tr>
</table></td></tr></table></body></html>`;
}

function itemsTable(items: { title: string; variant_title: string | null; quantity: number; total: number }[], totals: { label: string; value: string; bold?: boolean }[], lang: Lang) {
  const rows = items.map((i) => `<tr><td style="padding:8px 0;border-bottom:1px solid #eee;font-size:14px">${esc(i.title)}${i.variant_title ? `<br><span style="color:#86868b;font-size:12px">${esc(i.variant_title)}</span>` : ""} × ${i.quantity}</td><td align="right" style="padding:8px 0;border-bottom:1px solid #eee;font-size:14px;white-space:nowrap">${formatBDT(i.total, lang)}</td></tr>`).join("");
  const tot = totals.map((t) => `<tr><td style="padding:4px 0;font-size:14px;${t.bold ? "font-weight:600;font-size:16px" : "color:#6e6e73"}">${esc(t.label)}</td><td align="right" style="padding:4px 0;font-size:14px;${t.bold ? "font-weight:600;font-size:16px" : ""}">${esc(t.value)}</td></tr>`).join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px">${rows}${tot}</table>`;
}

export type EmailBlock = { type: "heading" | "text" | "button" | "products" | "image" | "divider"; text?: string; label?: string; url?: string; image?: string; source?: string; product_ids?: string[]; limit?: number };

/** Extra content blocks added to a template in Admin > Emails (text, buttons, images and product picks). */
async function renderBlocks(blocks: EmailBlock[], site: string, prefix: string, lang: Lang, accent: string) {
  const admin = createAdminClient();
  const out: string[] = [];
  for (const b of blocks.slice(0, 12)) {
    if (b.type === "heading" && b.text) out.push(`<h2 style="margin:28px 0 8px;font-size:20px;letter-spacing:-0.01em">${esc(b.text)}</h2>`);
    else if (b.type === "text" && b.text) out.push(`<p style="margin:12px 0;font-size:15px;line-height:1.6;color:#424245">${esc(b.text).replace(/\n/g, "<br>")}</p>`);
    else if (b.type === "button" && b.label) out.push(`<p style="margin:20px 0"><a href="${esc(b.url || site)}" style="display:inline-block;background:${accent};color:#fff;text-decoration:none;font-size:15px;font-weight:500;padding:12px 24px;border-radius:999px">${esc(b.label)}</a></p>`);
    else if (b.type === "image" && b.image) out.push(`<p style="margin:16px 0">${b.url ? `<a href="${esc(b.url)}">` : ""}<img src="${esc(b.image)}" alt="" width="504" style="width:100%;max-width:504px;border-radius:16px;display:block">${b.url ? "</a>" : ""}</p>`);
    else if (b.type === "divider") out.push(`<hr style="border:0;border-top:1px solid #e5e5ea;margin:24px 0">`);
    else if (b.type === "products") {
      const limit = Math.min(6, Math.max(1, Number(b.limit) || 4));
      let q = admin.from("products").select("id,title,slug,price,compare_at_price,product_media(url,type,sort_order)").eq("status", "published").limit(limit);
      if (b.product_ids?.length) q = q.in("id", b.product_ids.slice(0, 6));
      else if (b.source === "best_selling") q = q.order("sold_count", { ascending: false });
      else if (b.source === "on_sale") q = q.not("compare_at_price", "is", null).order("published_at", { ascending: false });
      else if (b.source === "featured") q = q.eq("is_featured", true);
      else q = q.order("published_at", { ascending: false });
      const { data } = await q;
      const ps = (data ?? []).map((p) => ({ ...p, img: ((p.product_media as { url: string; type: string; sort_order: number }[]) ?? []).filter((m) => m.type === "image").sort((a, c) => a.sort_order - c.sort_order)[0]?.url }));
      if (!ps.length) continue;
      if (b.text) out.push(`<h2 style="margin:28px 0 12px;font-size:20px">${esc(b.text)}</h2>`);
      const cells = ps.map((p) => `<td width="50%" valign="top" style="padding:6px"><a href="${site}${prefix}/product/${esc(p.slug)}" style="text-decoration:none;color:#1d1d1f;display:block;background:#f5f5f7;border-radius:16px;overflow:hidden">${p.img ? `<img src="${esc(p.img)}" alt="" width="240" style="width:100%;display:block;aspect-ratio:1/1;object-fit:cover">` : ""}<div style="padding:10px 12px 14px"><div style="font-size:14px;line-height:1.35;max-height:38px;overflow:hidden">${esc(p.title)}</div><div style="margin-top:6px;font-size:15px;font-weight:600">${formatBDT(Number(p.price), lang)}${p.compare_at_price && Number(p.compare_at_price) > Number(p.price) ? ` <span style="font-weight:400;color:#86868b;text-decoration:line-through;font-size:13px">${formatBDT(Number(p.compare_at_price), lang)}</span>` : ""}</div><div style="margin-top:8px;font-size:13px;color:${accent};font-weight:600">${lang === "bn" ? "এখনই কিনুন" : "Shop now"} &rarr;</div></div></a></td>`);
      const rows: string[] = [];
      for (let i = 0; i < cells.length; i += 2) rows.push(`<tr>${cells[i]}${cells[i + 1] ?? '<td width="50%"></td>'}</tr>`);
      out.push(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px">${rows.join("")}</table>`);
    }
  }
  return out.join("");
}

export async function buildEmail(event: EmailEvent, payload: Record<string, unknown>, toEmail: string) {
  const admin = createAdminClient();
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const store = await getSettingValue<{ name?: string; logo_url?: string | null }>("store");
  const storeName = store.name ?? process.env.NEXT_PUBLIC_SITE_NAME ?? "Lumen";
  const isAdmin = ADMIN_EVENTS.has(event) || event === "staff_invite";

  const { data: prof } = await admin.from("profiles").select("locale,full_name").eq("email", toEmail).maybeSingle();
  const lang: Lang = !isAdmin && prof?.locale === "bn" ? "bn" : "en";
  const prefix = lang === "bn" ? "/bn" : "";
  const ctx: Ctx = { store: storeName, name: String(payload.name ?? prof?.full_name ?? "").split(" ")[0] ?? "", note: String(payload.note ?? "") };
  let url: string | undefined = `${site}${prefix}/`;
  let extra = "";

  if (payload.order_id) {
    const { data: o } = await admin.from("orders").select("*, order_items(title,variant_title,quantity,total)").eq("id", payload.order_id as string).maybeSingle();
    if (o) {
      Object.assign(ctx, {
        order: o.order_number, name: String(o.customer_name).split(" ")[0], phone: o.phone, amount: formatBDT(Number(o.grand_total), lang),
        district: (o.shipping_address as { district?: string }).district ?? "", courier: o.courier ?? "", tracking: o.tracking_code ?? "",
        cod: formatBDT(Math.max(0, Number(o.grand_total) - Number(o.paid_amount)), lang),
      });
      url = isAdmin ? `${site}/admin/orders/${o.id}` : `${site}${prefix}/order/${o.order_number}?t=${o.access_token}`;
      if (event === "admin_return_request") url = `${site}/admin/orders/returns`;
      if (["order_placed", "payment_received", "admin_new_order", "order_confirmed"].includes(event)) {
        const L = lang === "bn" ? { s: "সাবটোটাল", d: "ছাড়", sh: "ডেলিভারি", t: "মোট" } : { s: "Subtotal", d: "Discount", sh: "Delivery", t: "Total" };
        extra = itemsTable((o.order_items as { title: string; variant_title: string | null; quantity: number; total: number }[]) ?? [], [
          { label: L.s, value: formatBDT(Number(o.subtotal), lang) },
          ...(Number(o.discount_total) ? [{ label: L.d, value: `−${formatBDT(Number(o.discount_total), lang)}` }] : []),
          { label: L.sh, value: formatBDT(Number(o.shipping_total), lang) },
          { label: L.t, value: formatBDT(Number(o.grand_total), lang), bold: true },
        ], lang);
      }
    }
  }
  if (payload.product_id) {
    const { data: p } = await admin.from("products").select("id,title,slug,price,stock").eq("id", payload.product_id as string).maybeSingle();
    if (p) {
      Object.assign(ctx, { product: p.title, amount: formatBDT(Number(p.price), lang), stock: String(p.stock) });
      url = isAdmin ? `${site}/admin/products/${p.id}` : `${site}${prefix}/product/${p.slug}`;
      if (event === "admin_review_pending") url = `${site}/admin/reviews`;
    }
  }
  if (payload.link) url = String(payload.link);
  if (event === "newsletter_confirm" && payload.token) url = `${site}/api/newsletter/confirm?token=${encodeURIComponent(String(payload.token))}`;
  if (event.startsWith("abandoned_cart")) url = `${site}${prefix}/cart`;
  if (payload.points) ctx.points = String(payload.points);
  if (payload.orders) ctx.orders = String(payload.orders);
  if (payload.amount && !ctx.amount) ctx.amount = formatBDT(Number(payload.amount), lang);

  const { data: override } = await admin.from("email_templates").select("subject,heading,body_html,is_active,blocks").eq("event", event).maybeSingle();
  const look = resolveAppearance(await getSettingValue<Partial<Appearance>>("theme"));
  const accent = look.accent || (PALETTES.find((p) => p.id === look.palette) ?? PALETTES[0]!).accent;
  const blocks = (Array.isArray(override?.blocks) ? override.blocks : []) as EmailBlock[];
  if (blocks.length) extra += await renderBlocks(blocks, site, prefix, lang, accent);
  if (override && override.is_active === false) return null;
  const def = DEFAULTS[event][lang];
  const subject = fill(lang === "en" && override?.subject ? override.subject : def.subject, ctx);
  const heading = fill(lang === "en" && override?.heading ? override.heading : def.heading, ctx);
  const body = fill(lang === "en" && override?.body_html ? override.body_html : def.body, ctx);
  const html = layout({ store: storeName, heading, body, cta: def.cta, url, extra, lang, logo: store.logo_url, accent });
  const text = `${heading}\n\n${body.replace(/<[^>]+>/g, "")}${url ? `\n\n${url}` : ""}`;
  return { subject, html, text };
}
