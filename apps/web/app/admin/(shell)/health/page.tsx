import Link from "next/link";
import { CheckCircle2, CircleAlert, CircleX } from "lucide-react";
import { requireStaff } from "@/lib/auth/rbac";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSettingValue } from "@/lib/settings/server";
import { aiReady } from "@/lib/ai/chat";

export const metadata = { title: "Site health" };
export const dynamic = "force-dynamic";

type Level = "ok" | "warn" | "bad";
interface Check { label: string; level: Level; detail?: string; fix?: string }

/** Setup checklist: what is ready, what needs attention before going live. */
export default async function HealthPage() {
  await requireStaff("dashboard.view");
  const admin = createAdminClient();
  const env = (k: string) => !!process.env[k];
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const [store, seo, tracking, checkout, ssl, bk, zones, products, pages, anyOrder, staff] = await Promise.all([
    getSettingValue<{ name?: string; phone?: string; email?: string; address?: string; logo_url?: string; favicon_url?: string; maintenance?: boolean }>("store"),
    getSettingValue<{ verify_google?: string; noindex_site?: boolean; verification?: { google?: string } }>("seo"),
    getSettingValue<{ enabled?: boolean; ga4_id?: string; gtm_id?: string; meta_pixel_id?: string }>("tracking"),
    getSettingValue<{ cod_enabled?: boolean }>("checkout"),
    getSettingValue<{ enabled?: boolean; enc?: string }>("payment.sslcommerz"), getSettingValue<{ enabled?: boolean; enc?: string }>("payment.bkash"),
    admin.from("shipping_zones").select("id", { count: "exact", head: true }).eq("is_active", true),
    admin.from("products").select("id", { count: "exact", head: true }).eq("status", "published"),
    admin.from("pages").select("slug").in("slug", ["privacy-policy", "terms", "return-policy", "about"]).eq("is_published", true),
    admin.from("orders").select("id", { count: "exact", head: true }),
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("is_staff", true),
  ]);
  const have = new Set((pages.data ?? []).map((p) => p.slug as string));
  const checks: { group: string; items: Check[] }[] = [
    { group: "Core", items: [
      { label: "Database connection", level: env("NEXT_PUBLIC_SUPABASE_URL") && env("SUPABASE_SERVICE_ROLE_KEY") ? "ok" : "bad", fix: "Set the Supabase keys in .env.local" },
      { label: "Encryption key for saved secrets", level: env("ENCRYPTION_KEY") ? "ok" : "bad", fix: "Set ENCRYPTION_KEY" },
      { label: "Scheduled jobs secret", level: env("CRON_SECRET") ? "ok" : "warn", detail: "Needed for email, courier and daily jobs", fix: "Set CRON_SECRET and add the cron jobs" },
      { label: "Site address", level: /localhost|127\.0\.0\.1/.test(site) ? "warn" : site ? "ok" : "bad", detail: site || "not set", fix: "Set NEXT_PUBLIC_SITE_URL to your real domain before launch" },
      { label: "Staff two-step sign-in", level: process.env.STAFF_REQUIRE_2FA === "false" ? "warn" : "ok", fix: "Set STAFF_REQUIRE_2FA=true" },
      { label: "Bot protection (Turnstile)", level: env("TURNSTILE_SECRET_KEY") ? "ok" : "warn", fix: "Add Turnstile keys, free from Cloudflare" },
      { label: "Rate limiting (Upstash)", level: env("UPSTASH_REDIS_REST_URL") ? "ok" : "warn", fix: "Add Upstash keys, free tier is enough" },
      { label: "Maintenance mode is off", level: store.maintenance ? "warn" : "ok", detail: store.maintenance ? "Customers currently see a closed notice" : undefined, fix: "Settings, General" },
    ] },
    { group: "Store", items: [
      { label: "Store name, phone, email and address", level: store.name && store.phone && store.email && store.address ? "ok" : "warn", fix: "Settings, General" },
      { label: "Logo", level: store.logo_url ? "ok" : "warn", fix: "Settings, General" },
      { label: "Favicon", level: store.favicon_url ? "ok" : "warn", detail: store.favicon_url ? undefined : "A letter icon is used", fix: "Settings, General" },
      { label: "Published products", level: (products.count ?? 0) > 0 ? "ok" : "bad", detail: `${products.count ?? 0} products`, fix: "Add or import products" },
      { label: "Delivery zones", level: (zones.count ?? 0) > 0 ? "ok" : "bad", detail: `${zones.count ?? 0} active`, fix: "Settings, Shipping zones" },
      { label: "Policy pages (about, privacy, terms, returns)", level: have.size === 4 ? "ok" : "warn", detail: `Missing: ${["about", "privacy-policy", "terms", "return-policy"].filter((s) => !have.has(s)).join(", ") || "none"}`, fix: "Pages, then New page (use these addresses)" },
      { label: "Staff accounts", level: (staff.count ?? 0) > 0 ? "ok" : "bad" },
    ] },
    { group: "Selling", items: [
      { label: "At least one payment method", level: checkout.cod_enabled !== false || (ssl.enabled && ssl.enc) || (bk.enabled && bk.enc) ? "ok" : "bad", fix: "Settings, Checkout or Payments" },
      { label: "Online payment (bKash or SSLCommerz)", level: (ssl.enabled && ssl.enc) || (bk.enabled && bk.enc) ? "ok" : "warn", detail: "Needed for advance payments", fix: "Payments" },
      { label: "Order emails (Resend)", level: env("RESEND_API_KEY") ? "ok" : "warn", fix: "Set RESEND_API_KEY" },
      { label: "Test order placed", level: (anyOrder.count ?? 0) > 0 ? "ok" : "warn", detail: "Place one test order before launch", fix: "Open a product and press Buy now" },
    ] },
    { group: "Search and marketing", items: [
      { label: "Search engines allowed", level: seo.noindex_site ? "bad" : "ok", detail: seo.noindex_site ? "The whole site is hidden from Google" : undefined, fix: "SEO, Sitemap and robots" },
      { label: "Search Console verified", level: seo.verify_google || seo.verification?.google ? "ok" : "warn", fix: "SEO, Search Console" },
      { label: "Analytics or pixel connected", level: tracking.enabled && (tracking.ga4_id || tracking.gtm_id || tracking.meta_pixel_id) ? "ok" : "warn", fix: "SEO, Analytics and pixels" },
      { label: "AI chatbot", level: (await aiReady().catch(() => false)) ? "ok" : "warn", detail: "Optional", fix: "AI chatbot, AI engine" },
    ] },
  ];
  const all = checks.flatMap((g) => g.items);
  const bad = all.filter((c) => c.level === "bad").length, warn = all.filter((c) => c.level === "warn").length;
  const icon = { ok: <CheckCircle2 className="h-5 w-5 text-success" />, warn: <CircleAlert className="h-5 w-5 text-warning" />, bad: <CircleX className="h-5 w-5 text-danger" /> };
  const fixHref = (fix?: string) => !fix ? null : fix.startsWith("Settings, Shipping") ? "/admin/shipping" : fix.startsWith("Settings") ? "/admin/settings" : fix.startsWith("Payments") ? "/admin/payments" : fix.startsWith("SEO") ? "/admin/seo" : fix.startsWith("Pages") ? "/admin/pages/new" : fix.startsWith("AI") ? "/admin/chatbot" : fix.startsWith("Add or import") ? "/admin/products/new" : null;
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="headline text-[28px]">Site health</h1>
      <p className="mt-1 text-[14px] text-fg-muted">{bad ? `${bad} must be fixed before launch` : "Nothing blocks launch"}{warn ? `, ${warn} worth a look.` : "."}</p>
      <div className="mt-6 space-y-5">
        {checks.map((g) => (
          <section key={g.group} className="rounded-[20px] bg-surface p-5 shadow-card">
            <h2 className="text-[16px] font-semibold">{g.group}</h2>
            <ul className="mt-3">{g.items.map((c) => {
              const href = c.level === "ok" ? null : fixHref(c.fix);
              return (
                <li key={c.label} className="flex items-start gap-3 border-b border-line py-2.5 last:border-0">
                  <span className="mt-0.5">{icon[c.level]}</span>
                  <div className="min-w-0 flex-1"><p className="text-[14px] font-medium">{c.label}</p>{c.detail && <p className="text-[12px] text-fg-muted">{c.detail}</p>}{c.level !== "ok" && c.fix && <p className="text-[12px] text-fg-muted">{c.fix}</p>}</div>
                  {href && <Link href={href} className="shrink-0 text-[13px] text-accent">Open</Link>}
                </li>
              );
            })}</ul>
          </section>
        ))}
      </div>
    </div>
  );
}
