"use client";
import { useState, useTransition } from "react";
import { Check, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, Field, Input } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { saveSettingsAction } from "./actions";

const TEMPLATES = [["classic", "Classic"], ["modern", "Modern"], ["minimal", "Minimal"], ["bold", "Bold"], ["elegant", "Elegant"], ["compact", "Receipt (80 mm)"]] as const;
type D = { template?: string; accent?: string; show_images?: boolean; show_barcode?: boolean; show_qr?: boolean; note?: string; signature?: boolean };

/** Small drawing of each invoice design in the store's color. */
function Mini({ id, color }: { id: string; color: string }) {
  const band = id === "classic" ? color : id === "bold" ? "#111" : "transparent";
  return (
    <div className={cn("mx-auto overflow-hidden rounded-[8px] border border-line bg-white", id === "compact" ? "h-28 w-14" : "h-28 w-20")} style={id === "modern" ? { borderLeft: `5px solid ${color}` } : undefined}>
      <div className="h-6" style={{ background: band }}>{id === "elegant" && <div className="mx-auto mt-4 h-0.5 w-8" style={{ background: color }} />}</div>
      <div className="space-y-1 p-1.5">{[0, 1, 2, 3].map((i) => <div key={i} className="h-1 rounded bg-neutral-200" />)}
        <div className="ml-auto mt-2 h-3 w-10 rounded" style={{ background: id === "minimal" || id === "compact" ? "#111" : id === "elegant" ? "transparent" : color, border: id === "elegant" ? `1px solid ${color}` : undefined }} />
        <div className="mt-1 flex gap-0.5">{Array.from({ length: 9 }).map((_, i) => <div key={i} className="h-3 bg-black" style={{ width: i % 3 ? 1 : 2 }} />)}</div>
      </div>
    </div>
  );
}

export function InvoiceDesignEditor({ value, canEdit, brand, sampleUrl }: { value: D; canEdit: boolean; brand: string; sampleUrl?: string }) {
  const toast = useToast();
  const [d, setD] = useState<D>({ template: "classic", show_images: true, show_barcode: true, show_qr: true, ...value });
  const [pending, start] = useTransition();
  const color = d.accent || brand;
  return (
    <Card title="Invoice and packing slip design" description="Choose a design. Colors follow your brand automatically; you can set a different invoice color. Barcode and QR code help couriers and customers track the order."
      actions={sampleUrl && <a href={sampleUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[14px] text-accent">Preview <ExternalLink className="h-3.5 w-3.5" /></a>}>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">{TEMPLATES.map(([id, label]) => (
        <button key={id} type="button" onClick={() => setD((s) => ({ ...s, template: id }))} aria-pressed={d.template === id} className={cn("rounded-[14px] border-2 p-2", d.template === id ? "border-accent" : "border-transparent hover:border-line")}>
          <Mini id={id} color={color} /><span className="mt-1.5 flex items-center justify-center gap-1 text-[12px] font-medium">{label}{d.template === id && <Check className="h-3.5 w-3.5 text-accent" />}</span>
        </button>))}</div>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <Switch checked={d.show_barcode !== false} onChange={(v) => setD((s) => ({ ...s, show_barcode: v }))} label="Barcode of the order number" />
          <Switch checked={d.show_qr !== false} onChange={(v) => setD((s) => ({ ...s, show_qr: v }))} label="QR code to track the order" />
          <Switch checked={d.show_images !== false} onChange={(v) => setD((s) => ({ ...s, show_images: v }))} label="Product photos" />
          <Switch checked={!!d.signature} onChange={(v) => setD((s) => ({ ...s, signature: v }))} label="Signature line" />
        </div>
        <div className="space-y-3">
          <label className="flex items-center gap-3 text-[14px]">Invoice color <input type="color" value={color} onChange={(e) => setD((s) => ({ ...s, accent: e.target.value }))} className="h-9 w-12 cursor-pointer rounded-lg border border-line bg-transparent" />
            {d.accent && <button type="button" className="text-accent" onClick={() => setD((s) => ({ ...s, accent: "" }))}>Use brand color</button>}</label>
          <Field label="Thank-you note (optional)" htmlFor="inv-note"><Input id="inv-note" value={d.note ?? ""} onChange={(e) => setD((s) => ({ ...s, note: e.target.value }))} placeholder="Thank you for shopping with us!" /></Field>
        </div>
      </div>
      {canEdit && <Button className="mt-4" disabled={pending} onClick={() => start(async () => { const r = await saveSettingsAction("invoice_design", d); toast(r.ok ? "Invoice design saved" : r.error, r.ok ? "success" : "error"); })}>Save invoice design</Button>}
    </Card>
  );
}
