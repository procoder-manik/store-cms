import Link from "next/link";
import { requireStaff } from "@/lib/auth/rbac";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSettingValue, secretKeysSet } from "@/lib/settings/server";
import { getImportPricing } from "@/lib/importers/pricing";
import { SettingsForm } from "@/components/admin/settings/settings-form";
import { StatusBadge } from "@/components/admin/orders/status-badge";
import { ImportBox, TokenManager } from "./import-tools";

export const metadata = { title: "Import products" };

export default async function ImportsPage() {
  const staff = await requireStaff("imports.view");
  const admin = createAdminClient();
  const [{ data: jobs }, { data: tokens }, ali, aliSet, pricing, importRaw] = await Promise.all([
    admin.from("import_jobs").select("id,source_platform,url,status,error,product_id,created_at,normalized->>title,normalized->>site").order("created_at", { ascending: false }).limit(50),
    admin.from("import_tokens").select("id,name,last_used_at,revoked_at,created_at").order("created_at", { ascending: false }),
    getSettingValue("import.aliexpress"), secretKeysSet("import.aliexpress"), getImportPricing(), getSettingValue("import"),
  ]);
  const can = staff.can("imports.update");
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div>
        <h1 className="headline text-[28px]">Import products</h1>
        <p className="mt-1 text-[14px] text-fg-muted">AliExpress: paste a link. Temu and Alibaba: open the product in Chrome and use the extension. Every import waits here for your review.</p>
      </div>
      {staff.can("imports.create") && <ImportBox />}

      <section className="rounded-[20px] bg-surface p-5 shadow-card">
        <h2 className="text-[17px] font-semibold">Recent imports</h2>
        <ul className="mt-2">
          {(jobs ?? []).map((j) => (
            <li key={j.id as string} className="flex flex-wrap items-center gap-3 border-b border-line py-3 text-[14px] last:border-0">
              <StatusBadge status={j.status === "imported" ? "delivered" : j.status === "failed" ? "failed" : "pending"} />
              <span className="w-28 truncate text-fg-muted">{(j.site as string) || (j.source_platform as string)}</span>
              <Link href={j.product_id ? `/admin/products/${j.product_id}` : `/admin/imports/${j.id}`} className="min-w-0 flex-1 truncate hover:text-accent">
                {(j.title as string) ?? (j.url as string)}
              </Link>
              {j.status !== "imported" && <Link href={`/admin/imports/${j.id}`} className="text-accent">Review</Link>}
              {j.error && <span className="w-full text-[12px] text-danger">{j.error as string}</span>}
            </li>
          ))}
          {!jobs?.length && <li className="py-8 text-center text-fg-muted">No imports yet.</li>}
        </ul>
      </section>

      <TokenManager tokens={(tokens ?? []) as never} canCreate={staff.can("imports.create")} siteUrl={process.env.NEXT_PUBLIC_SITE_URL ?? ""} />

      <SettingsForm settingKey="import" title="Pricing rules" description="How source prices become your selling price in Taka." canEdit={can}
        values={{ ...importRaw, usd_to_bdt: pricing.rates.USD, cny_to_bdt: pricing.rates.CNY, cad_to_bdt: pricing.rates.CAD, markup_percent: pricing.markup_percent, markup_fixed: pricing.markup_fixed, copy_video: pricing.copy_video }}
        fields={[
          { name: "usd_to_bdt", label: "1 USD in Taka", type: "number" }, { name: "cny_to_bdt", label: "1 CNY in Taka", type: "number" },
          { name: "cad_to_bdt", label: "1 CAD in Taka", type: "number" }, { name: "markup_percent", label: "Markup (%)", type: "number", hint: "Covers shipping from abroad, customs and profit." },
          { name: "markup_fixed", label: "Extra fixed amount (৳)", type: "number" }, { name: "rounding", label: "Rounding: none, nearest_10, nearest_50 or ends_9", type: "text" },
          { name: "copy_video", label: "Copy product video", type: "switch" },
        ]} />
      <SettingsForm settingKey="import.aliexpress" title="AliExpress API" description="Free. From openservice.aliexpress.com: create an app (Dropshipping), then authorise your AliExpress account to get an access token." canEdit={can}
        values={ali} savedSecrets={aliSet} fields={[
          { name: "enabled", label: "Use the AliExpress API for pasted links", type: "switch" },
          { name: "app_key", label: "App key", type: "secret" }, { name: "app_secret", label: "App secret", type: "secret" }, { name: "access_token", label: "Access token", type: "secret" },
        ]} />
    </div>
  );
}
