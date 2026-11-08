import QRCode from "qrcode";
import { formatBDT } from "@/lib/utils";
import { code128Svg } from "@/lib/barcode/code128";
import type { OrderView } from "@/lib/data/orders";

export type InvoiceTemplate = "classic" | "modern" | "minimal" | "bold" | "elegant" | "compact";
export const INVOICE_TEMPLATES: { id: InvoiceTemplate; label: string; hint: string }[] = [
  { id: "classic", label: "Classic", hint: "Brand color header band" },
  { id: "modern", label: "Modern", hint: "Side color stripe, airy" },
  { id: "minimal", label: "Minimal", hint: "Black and white, thin lines" },
  { id: "bold", label: "Bold", hint: "Dark header, big total" },
  { id: "elegant", label: "Elegant", hint: "Centered serif, premium" },
  { id: "compact", label: "Receipt", hint: "80 mm thermal printer" },
];

export interface InvoiceStore {
  name: string; address?: string; phone?: string; email?: string; footer?: string; bin?: string; logo_url?: string | null; site?: string;
  design?: { template?: InvoiceTemplate; accent?: string; show_images?: boolean; show_barcode?: boolean; show_qr?: boolean; note?: string; signature?: boolean };
}

const money = (n: number) => formatBDT(n);
const date = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Dhaka" });

/** Print-ready invoice or packing slip in six designs, using the store's brand color. Barcode and QR code for scanning. */
export async function Invoice({ order, store, kind = "invoice" }: { order: OrderView; store: InvoiceStore; kind?: "invoice" | "slip" }) {
  const d = store.design ?? {};
  const tpl: InvoiceTemplate = d.template ?? "classic";
  const A = d.accent ?? "#0071e3";
  const a = order.shipping_address;
  const isInvoice = kind === "invoice";
  const paid = order.payment_status === "paid";
  const partial = !paid && order.paid_amount > 0;
  const due = Math.max(0, order.grand_total - order.paid_amount);
  const cod = !paid;
  const number = isInvoice ? order.order_number.replace("ORD-", "INV-") : order.order_number;
  const itemCount = order.items.reduce((s, i) => s + i.quantity, 0);
  const method = order.payment_method === "cod" ? "Cash on delivery" : order.payment_method === "bkash" ? "bKash" : "Card / mobile banking";
  const trackUrl = `${store.site ?? ""}/track-order?o=${encodeURIComponent(order.order_number)}`;
  const barcode = d.show_barcode !== false ? code128Svg(order.order_number, { height: tpl === "compact" ? 46 : 54, module: tpl === "compact" ? 1.4 : 1.8 }) : "";
  const qr = d.show_qr !== false ? await QRCode.toString(trackUrl, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#000000", light: "#ffffff" } }) : "";
  const compact = tpl === "compact";
  const dark = tpl === "bold";
  const serif = tpl === "elegant" ? { fontFamily: "var(--font-playfair), Georgia, serif" } : undefined;
  const badge = isInvoice ? (paid ? { t: "PAID", c: "#1a9d4a" } : partial ? { t: "PARTIALLY PAID", c: "#c26a00" } : { t: "PAY ON DELIVERY", c: "#c26a00" }) : null;

  const Logo = ({ invert }: { invert?: boolean }) => (
    // eslint-disable-next-line @next/next/no-img-element
    store.logo_url ? <img src={store.logo_url} alt={store.name} className="h-10 w-auto" style={invert ? { filter: "brightness(0) invert(1)" } : undefined} />
      : <p className="text-[24px] font-semibold tracking-tight" style={serif}>{store.name}</p>
  );
  const storeLine = [store.address, store.phone, store.email].filter(Boolean).join("  |  ");
  const codes = (barcode || qr) && (
    <div className="flex items-end gap-4">
      {barcode && <div className="[&_svg]:h-auto [&_svg]:max-w-[220px]" dangerouslySetInnerHTML={{ __html: barcode }} />}
      {qr && <div className="flex flex-col items-center gap-1"><div className="h-[72px] w-[72px] [&_svg]:h-full [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: qr }} /><span className="text-[9px] text-neutral-500">Scan to track</span></div>}
    </div>
  );

  const header = (() => {
    if (tpl === "classic") return (
      <div className="px-10 pb-7 pt-9 text-white" style={{ background: A }}>
        <div className="flex items-start justify-between gap-6">
          <div><Logo invert /><p className="mt-2 max-w-[320px] text-[12px] opacity-80">{storeLine}</p>{store.bin && <p className="text-[12px] opacity-80">BIN: {store.bin}</p>}</div>
          <div className="text-right"><p className="text-[12px] uppercase tracking-[0.18em] opacity-70">{isInvoice ? "Invoice" : "Packing slip"}</p><p className="mt-1 text-[24px] font-semibold">{number}</p>
            {badge && <span className="mt-2 inline-block rounded-full bg-white px-3 py-1 text-[11px] font-bold tracking-wider" style={{ color: badge.c }}>{badge.t}</span>}</div>
        </div>
      </div>
    );
    if (tpl === "bold") return (
      <div className="bg-[#111] px-10 pb-8 pt-10 text-white">
        <div className="flex items-start justify-between gap-6"><div><Logo invert /><p className="mt-2 max-w-[320px] text-[12px] text-white/60">{storeLine}</p></div>
          <div className="text-right"><p className="text-[44px] font-black uppercase leading-none tracking-tight" style={{ color: A }}>{isInvoice ? "Invoice" : "Slip"}</p><p className="mt-2 text-[15px] font-semibold">{number}</p></div></div>
      </div>
    );
    if (tpl === "elegant") return (
      <div className="px-10 pt-12 text-center">
        <div className="flex justify-center"><Logo /></div>
        <p className="mt-2 text-[12px] text-neutral-500">{storeLine}</p>
        <div className="mx-auto my-6 h-px w-24" style={{ background: A }} />
        <p className="text-[30px] italic" style={serif}>{isInvoice ? "Invoice" : "Packing slip"}</p>
        <p className="mt-1 text-[13px] tracking-[0.2em] text-neutral-500">{number}</p>
      </div>
    );
    if (compact) return (
      <div className="px-4 pt-5 text-center">
        <p className="text-[18px] font-bold">{store.name}</p>
        {store.phone && <p className="text-[11px]">{store.phone}</p>}
        <p className="mt-2 border-y border-dashed border-black py-1 text-[12px] font-semibold">{isInvoice ? "INVOICE" : "PACKING SLIP"} {number}</p>
      </div>
    );
    // modern + minimal
    return (
      <div className="flex items-start justify-between gap-6 px-10 pt-10" style={tpl === "modern" ? { borderLeft: `10px solid ${A}` } : undefined}>
        <div><Logo /><p className="mt-2 max-w-[320px] text-[12px] text-neutral-500">{storeLine}</p>{store.bin && <p className="text-[12px] text-neutral-500">BIN: {store.bin}</p>}</div>
        <div className="text-right"><p className="text-[12px] uppercase tracking-[0.18em] text-neutral-500">{isInvoice ? "Invoice" : "Packing slip"}</p>
          <p className="mt-1 text-[26px] font-semibold" style={tpl === "modern" ? { color: A } : undefined}>{number}</p>
          {badge && <span className="mt-2 inline-block rounded-full border px-3 py-1 text-[11px] font-bold tracking-wider" style={{ color: badge.c, borderColor: badge.c }}>{badge.t}</span>}</div>
      </div>
    );
  })();

  const label = "text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500";
  return (
    <div className="invoice mx-auto bg-white text-[13px] leading-relaxed text-neutral-900" style={{ maxWidth: compact ? 320 : 800, WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>
      <style>{`@media print { @page { size: ${compact ? "80mm auto" : "A4"}; margin: 0 } body { background: #fff !important; margin: 0 } .no-print { display: none !important } .invoice { max-width: none !important } } .invoice table { border-collapse: collapse } .invoice tr { break-inside: avoid }`}</style>
      {header}
      <div className={compact ? "px-4 pb-6 pt-3" : "px-10 pb-10 pt-8"}>
        <div className={compact ? "space-y-2 text-[12px]" : "grid grid-cols-3 gap-6"}>
          <div><p className={label}>Billed to</p><p className="mt-1.5 text-[14px] font-semibold">{order.customer_name}</p><p>{order.phone}</p>{order.email && !compact && <p className="text-neutral-600">{order.email}</p>}</div>
          <div><p className={label}>Deliver to</p><p className="mt-1.5">{[a.address_line, a.upazila].filter(Boolean).join(", ")}</p><p>{[a.district, a.division].filter(Boolean).join(", ")}</p></div>
          <div className={compact ? "" : "text-right"}><p className={label}>Details</p><p className="mt-1.5">Date: {date(order.placed_at)}</p><p>Payment: {method}</p>{order.courier && <p>Courier: {order.courier}{order.tracking_code ? ` (${order.tracking_code})` : ""}</p>}</div>
        </div>

        <table className={compact ? "mt-4 w-full text-[12px]" : "mt-8 w-full"}>
          <thead><tr className="border-b-2 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-500" style={{ borderColor: tpl === "minimal" || compact ? "#111" : A }}>
            {!compact && <th className="w-8 pb-2">#</th>}<th className="pb-2">Item</th><th className="pb-2 text-center">Qty</th>
            {isInvoice && <><th className={compact ? "pb-2 text-right" : "pb-2 text-right"}>{compact ? "Total" : "Price"}</th>{!compact && <th className="pb-2 text-right">Amount</th>}</>}
            {!isInvoice && <th className="w-16 pb-2 text-center">Packed</th>}
          </tr></thead>
          <tbody>{order.items.map((i, n) => (
            <tr key={i.id} className="border-b border-neutral-200 align-top">
              {!compact && <td className="py-3 text-neutral-400">{n + 1}</td>}
              <td className={compact ? "py-1.5 pr-2" : "py-3 pr-4"}>
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {!compact && d.show_images !== false && i.image_url && <img src={i.image_url} alt="" className="h-11 w-11 rounded-lg object-cover" />}
                  <div><p className="font-medium">{i.title}</p>{i.variant_title && <p className="text-[12px] text-neutral-500">{i.variant_title}</p>}{i.sku && !compact && <p className="text-[11px] text-neutral-400">SKU {i.sku}</p>}</div>
                </div>
              </td>
              <td className="py-3 text-center font-medium">{i.quantity}</td>
              {isInvoice && <>{!compact && <td className="py-3 text-right text-neutral-600">{money(i.unit_price)}</td>}<td className="py-3 text-right font-medium">{money(i.total)}</td></>}
              {!isInvoice && <td className="py-3 text-center"><span className="inline-block h-4 w-4 rounded border border-neutral-400" /></td>}
            </tr>
          ))}</tbody>
        </table>
        <p className="mt-2 text-[12px] text-neutral-500">{itemCount} item{itemCount === 1 ? "" : "s"}</p>

        <div className={compact ? "mt-3 space-y-3" : "mt-6 grid grid-cols-[1fr_280px] gap-8"}>
          <div className="space-y-3">
            {Object.keys(order.custom_fields ?? {}).length > 0 && <div className="rounded-xl bg-neutral-100 p-3.5">{Object.entries(order.custom_fields).map(([k, v]) => <p key={k}><span className="text-neutral-500">{k.replace(/_/g, " ")}:</span> {v}</p>)}</div>}
            {order.customer_note && <div className="rounded-xl bg-neutral-100 p-3.5"><p className={label}>Customer note</p><p className="mt-1">{order.customer_note}</p></div>}
            {!compact && codes}
          </div>
          {isInvoice ? (
            <dl className="space-y-1.5">
              <div className="flex justify-between"><dt className="text-neutral-600">Subtotal</dt><dd>{money(order.subtotal)}</dd></div>
              {order.discount_total > 0 && <div className="flex justify-between" style={{ color: "#1a9d4a" }}><dt>Discount{order.coupon_code ? ` (${order.coupon_code})` : ""}</dt><dd>-{money(order.discount_total)}</dd></div>}
              <div className="flex justify-between"><dt className="text-neutral-600">Delivery</dt><dd>{order.shipping_total ? money(order.shipping_total) : "Free"}</dd></div>
              <div className="mt-2 flex items-center justify-between rounded-xl px-4 py-3 text-[16px] font-semibold"
                style={tpl === "minimal" || compact ? { borderTop: "2px solid #111", borderRadius: 0, padding: "10px 0" } : tpl === "elegant" ? { borderTop: `1px solid ${A}`, borderBottom: `1px solid ${A}`, borderRadius: 0 } : { background: dark ? "#111" : A, color: "#fff" }}>
                <dt>Total</dt><dd style={dark ? { color: A } : undefined}>{money(order.grand_total)}</dd>
              </div>
              {partial && <><div className="flex justify-between pt-1"><dt className="text-neutral-600">Paid in advance</dt><dd>-{money(order.paid_amount)}</dd></div><div className="flex justify-between font-semibold"><dt>Due on delivery</dt><dd>{money(due)}</dd></div></>}
              {cod && <p className="pt-1 text-right text-[12px] font-medium" style={{ color: "#c26a00" }}>Please pay {money(due)} in cash to the delivery person.</p>}
              {paid && <p className="pt-1 text-right text-[12px]" style={{ color: "#1a9d4a" }}>Paid in full. Thank you!</p>}
            </dl>
          ) : (
            <div className="rounded-xl border-2 border-dashed border-neutral-300 p-4 text-center">
              <p className={label}>{paid ? "Payment" : "Collect on delivery"}</p>
              <p className="mt-1 text-[22px] font-semibold">{paid ? "PAID" : money(due)}</p>
            </div>
          )}
          {compact && <div className="flex justify-center pt-2">{codes}</div>}
        </div>

        {d.signature && !compact && <div className="mt-12 flex justify-end"><div className="w-48 border-t border-neutral-400 pt-1 text-center text-[11px] text-neutral-500">Authorized signature</div></div>}
        <div className={compact ? "mt-4 border-t border-dashed border-black pt-3 text-center text-[11px]" : "mt-10 border-t border-neutral-200 pt-5 text-center text-[12px] text-neutral-500"}>
          {(d.note || store.footer) && <p className="text-[13px] text-neutral-700">{d.note || store.footer}</p>}
          <p className="mt-1">Questions? {store.phone ?? store.email ?? "Contact us"}{store.site ? `  ·  ${store.site.replace(/^https?:\/\//, "")}` : ""}</p>
        </div>
        <div className="no-print mt-8 text-center"><button data-print className="rounded-full px-7 py-3 text-[14px] font-medium text-white" style={{ background: A }}>Print or save as PDF</button></div>
      </div>
    </div>
  );
}
