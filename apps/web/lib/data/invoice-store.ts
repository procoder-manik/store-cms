import "server-only";
import { getSettingValue } from "@/lib/settings/server";
import { PALETTES, resolveAppearance, type Appearance } from "@/lib/theme/presets";
import type { InvoiceStore } from "@/components/invoice";

/** Store details and invoice design. Name, logo and colors come from this site's settings, so each store prints its own brand. */
export async function invoiceStore(): Promise<InvoiceStore> {
  const [store, inv, design, theme] = await Promise.all([
    getSettingValue<{ name?: string; address?: string; phone?: string; email?: string; logo_url?: string | null }>("store"),
    getSettingValue<{ footer_note?: string; bin?: string }>("invoice"),
    getSettingValue<NonNullable<InvoiceStore["design"]>>("invoice_design"),
    getSettingValue<Partial<Appearance>>("theme"),
  ]);
  const look = resolveAppearance(theme);
  const accent = design.accent || look.accent || (PALETTES.find((p) => p.id === look.palette) ?? PALETTES[0]!).accent;
  return {
    name: store.name ?? process.env.NEXT_PUBLIC_SITE_NAME ?? "Lumen", address: store.address, phone: store.phone, email: store.email, logo_url: store.logo_url,
    footer: inv.footer_note, bin: inv.bin, site: (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, ""),
    design: { template: "classic", show_images: true, show_barcode: true, show_qr: true, ...design, accent },
  };
}
