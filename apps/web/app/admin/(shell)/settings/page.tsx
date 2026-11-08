import Link from "next/link";
import { requireStaff } from "@/lib/auth/rbac";
import { cn } from "@/lib/utils";
import { getSettingValue } from "@/lib/settings/server";
import { SettingsForm } from "@/components/admin/settings/settings-form";
import { CheckoutFieldsEditor } from "@/components/admin/settings/checkout-fields-editor";
import { InvoiceDesignEditor } from "@/components/admin/settings/invoice-design-editor";
import { createAdminClient } from "@/lib/supabase/admin";
import { PALETTES, resolveAppearance, type Appearance } from "@/lib/theme/presets";

export const metadata = { title: "Settings" };

const TABS = [["general", "General"], ["checkout", "Checkout and delivery"], ["rewards", "Rewards"], ["invoice", "Invoices"], ["social", "Social links"]] as const;

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const staff = await requireStaff("settings.view");
  const tab = (await searchParams).tab ?? "general";
  const get = (k: string) => getSettingValue(k);
  const can = staff.can("settings.update");
  let body: React.ReactNode;

  if (tab === "checkout") {
    const [checkout, checkoutFields] = await Promise.all([get("checkout"), get("checkout_fields")]);
    body = (
      <>
        <SettingsForm settingKey="checkout" title="Delivery charge" description="Switch delivery charges on or off for the whole store, choose how they are calculated, and decide when customers pay them. A product can also be set to free delivery in its own settings." canEdit={can} values={checkout!} fields={[
          { name: "shipping_enabled", label: "Charge for delivery", type: "switch", hint: "Off = no delivery charge is added and the delivery line is hidden at checkout." },
          { name: "shipping_method", label: "How to calculate", type: "select", options: [{ value: "zones", label: "By delivery zone (set rates per area in Shipping zones)" }, { value: "flat", label: "One flat rate for everywhere" }] },
          { name: "flat_rate", label: "Flat rate (৳)", type: "number", hint: "Used when the method is flat rate." },
          { name: "flat_free_over", label: "Free delivery over (৳, flat rate only)", type: "number", hint: "Zone rates have their own free-over setting." },
          { name: "shipping_collect", label: "When to collect the delivery charge", type: "select", hint: "Each product can override this in its Payment rules.", options: [
            { value: "on_delivery", label: "On delivery (with the product price)" }, { value: "prepaid", label: "In advance online (bKash or card)" }] },
        ]} />
        <p className="px-1 text-[13px] text-fg-muted">Rates, areas and delivery times for each zone are in Settings, then Shipping zones.</p>
        <SettingsForm settingKey="checkout" title="Checkout" canEdit={can} values={checkout!} fields={[
          { name: "cod_enabled", label: "Cash on delivery", type: "switch" }, { name: "guest_checkout", label: "Allow checkout without an account", type: "switch" },
          { name: "min_order", label: "Minimum order (৳)", type: "number" },
          { name: "default_advance_percent", label: "Default advance payment (%)", type: "number", hint: "0 = none. Customers can choose to pay this part online and the rest on delivery." },
        ]} />
        <CheckoutFieldsEditor value={checkoutFields as never} canEdit={can} />
      </>
    );
  } else if (tab === "rewards") {
    const [referral, loyalty] = await Promise.all([get("referral"), get("loyalty")]);
    body = (
      <>
        <SettingsForm settingKey="referral" title="Referral program" description="Each customer gets a share link. When a referred friend's first order is delivered, the referrer earns a discount and points." canEdit={can} values={referral!} fields={[
          { name: "enabled", label: "Referral program on", type: "switch" }, { name: "percent_per_referral", label: "Discount per successful referral (%)", type: "number" },
          { name: "max_percent", label: "Maximum discount on one order (%)", type: "number", hint: "Example: 10% per friend, at most 50%." },
          { name: "max_amount", label: "Maximum discount amount (৳, optional)", type: "number" }, { name: "points_per_referral", label: "Points per successful referral", type: "number" },
        ]} />
        <SettingsForm settingKey="loyalty" title="Loyalty points" description="Customers earn points on delivered orders and spend them at checkout." canEdit={can} values={loyalty!} fields={[
          { name: "enabled", label: "Loyalty points on", type: "switch" }, { name: "points_per_100_bdt", label: "Points earned per ৳100 spent", type: "number" },
          { name: "bdt_per_point", label: "Value of 1 point (৳)", type: "number" }, { name: "max_redeem_percent", label: "Max share of an order paid with points (%)", type: "number" },
        ]} />
      </>
    );
  } else if (tab === "invoice") {
    const [invoice, invoiceDesign, themeSet] = await Promise.all([get("invoice"), get("invoice_design"), get("theme")]);
    const look = resolveAppearance(themeSet as Partial<Appearance>);
    const brand = look.accent || (PALETTES.find((p) => p.id === look.palette) ?? PALETTES[0]!).accent;
    const { data: lastOrder } = await createAdminClient().from("orders").select("id").order("placed_at", { ascending: false }).limit(1).maybeSingle();
    body = (
      <>
        <InvoiceDesignEditor value={invoiceDesign as never} canEdit={can} brand={brand} sampleUrl={lastOrder ? `/admin/print/${lastOrder.id}` : undefined} />
        <SettingsForm settingKey="invoice" title="Invoice details" canEdit={can} values={invoice!} fields={[{ name: "footer_note", label: "Footer note", type: "text" }, { name: "bin", label: "BIN / VAT number", type: "text" }]} />
      </>
    );
  } else if (tab === "social") {
    body = (
      <SettingsForm settingKey="social" title="Social links" description="Shown in the footer and added to your business schema." canEdit={can} values={(await get("social"))!} fields={[
        { name: "facebook", label: "Facebook page", type: "url" }, { name: "instagram", label: "Instagram", type: "url" }, { name: "youtube", label: "YouTube", type: "url" }, { name: "tiktok", label: "TikTok", type: "url" },
        { name: "whatsapp", label: "WhatsApp number", type: "text" },
      ]} />
    );
  } else {
    body = (
      <SettingsForm settingKey="store" title="Store identity" description="Name, contact details, logo and icon. They are used on the site, in emails, invoices and search results." canEdit={can} values={(await get("store"))!} fields={[
        { name: "name", label: "Store name", type: "text" }, { name: "tagline", label: "Tagline", type: "text" },
        { name: "email", label: "Support email", type: "email", hint: "New order alerts go here too." }, { name: "phone", label: "Phone", type: "text" },
        { name: "address", label: "Address", type: "textarea" },
        { name: "logo_url", label: "Logo URL", type: "url", hint: "Copy a URL from the Media library." }, { name: "favicon_url", label: "Favicon / app icon URL", type: "url", hint: "Square PNG, at least 512×512. Empty = a letter icon is generated." },
        { name: "maintenance", label: "Maintenance mode (customers see a closed notice, staff can still browse)", type: "switch" },
      ]} />
    );
  }
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="headline text-[28px]">Settings</h1>
      <nav className="no-scrollbar mt-5 flex gap-1 overflow-x-auto" aria-label="Settings sections">{TABS.map(([k, l]) => <Link key={k} href={`/admin/settings?tab=${k}`} className={cn("shrink-0 rounded-full px-4 py-1.5 text-[14px]", tab === k ? "bg-fg text-background" : "text-fg-muted hover:bg-fill")}>{l}</Link>)}</nav>
      <div className="mt-6 space-y-5">{body}</div>
    </div>
  );
}
