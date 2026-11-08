import { requireStaff } from "@/lib/auth/rbac";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSettingValue, secretKeysSet } from "@/lib/settings/server";
import { SettingsForm } from "@/components/admin/settings/settings-form";
import { ZoneManager, type Zone } from "./zone-manager";

export const metadata = { title: "Shipping" };

export default async function ShippingPage() {
  const staff = await requireStaff("shipping.view");
  const can = staff.can("shipping.update");
  const [{ data: zones }, sf, pa, rx, sfSet, paSet, rxSet] = await Promise.all([
    createAdminClient().from("shipping_zones").select("*").order("sort_order"),
    getSettingValue("courier.steadfast"), getSettingValue("courier.pathao"), getSettingValue("courier.redx"),
    secretKeysSet("courier.steadfast"), secretKeysSet("courier.pathao"), secretKeysSet("courier.redx"),
  ]);
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <h1 className="headline text-[28px]">Shipping</h1>
      <ZoneManager zones={(zones ?? []) as Zone[]} canEdit={can} canDelete={staff.can("shipping.delete")} />
      <h2 className="headline pt-4 text-[22px]">Couriers</h2>
      <SettingsForm settingKey="courier.steadfast" title="Steadfast" canEdit={can} values={sf} savedSecrets={sfSet}
        description={`Webhook URL: ${site}/api/couriers/steadfast (use the webhook token below as the Bearer token)`} fields={[
          { name: "enabled", label: "Enabled", type: "switch" },
          { name: "api_key", label: "API key", type: "secret" }, { name: "secret_key", label: "Secret key", type: "secret" },
          { name: "webhook_token", label: "Webhook token (any long random text)", type: "secret" },
        ]} />
      <SettingsForm settingKey="courier.pathao" title="Pathao" canEdit={can} values={pa} savedSecrets={paSet}
        description={`Webhook URL: ${site}/api/couriers/pathao`} fields={[
          { name: "enabled", label: "Enabled", type: "switch" }, { name: "sandbox", label: "Sandbox (test) mode", type: "switch" },
          { name: "store_id", label: "Store ID", type: "text", hint: "From Pathao merchant panel, Stores." },
          { name: "client_id", label: "Client ID", type: "secret" }, { name: "client_secret", label: "Client secret", type: "secret" },
          { name: "username", label: "Merchant email", type: "secret" }, { name: "password", label: "Merchant password", type: "secret" },
          { name: "webhook_secret", label: "Webhook secret", type: "secret" },
        ]} />
      <SettingsForm settingKey="courier.redx" title="RedX" canEdit={can} values={rx} savedSecrets={rxSet}
        description={`Webhook URL: ${site}/api/couriers/redx?token=YOUR_WEBHOOK_TOKEN`} fields={[
          { name: "enabled", label: "Enabled", type: "switch" }, { name: "sandbox", label: "Sandbox (test) mode", type: "switch" },
          { name: "pickup_store_id", label: "Pickup store ID (optional)", type: "text" },
          { name: "api_token", label: "API access token", type: "secret" }, { name: "webhook_token", label: "Webhook token (any long random text)", type: "secret" },
        ]} />
    </div>
  );
}
