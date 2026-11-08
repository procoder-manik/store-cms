"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, Field, Input, Select, Textarea } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { BD_DIVISIONS } from "@/lib/data/bd-locations";
import { formatBDT } from "@/lib/utils";
import { createManualOrderAction, searchProductsForOrderAction, type OrderPick } from "../actions";

type Line = OrderPick & { quantity: number };

export function ManualOrder() {
  const router = useRouter();
  const toast = useToast();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<OrderPick[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [confirmNow, setConfirmNow] = useState(true);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (q.trim().length < 2) { setResults([]); return; }
    const id = setTimeout(async () => setResults(await searchProductsForOrderAction(q)), 250);
    return () => clearTimeout(id);
  }, [q]);

  const addLine = (p: OrderPick) => {
    setLines((ls) => {
      const i = ls.findIndex((l) => l.productId === p.productId && l.variantId === p.variantId);
      if (i >= 0) return ls.map((l, j) => (j === i ? { ...l, quantity: l.quantity + 1 } : l));
      return [...ls, { ...p, quantity: 1 }];
    });
    setQ(""); setResults([]);
  };
  const subtotal = lines.reduce((s, l) => s + l.price * l.quantity, 0);

  return (
    <form className="mt-6 grid gap-5" onSubmit={(e) => {
      e.preventDefault();
      const f = new FormData(e.currentTarget);
      start(async () => {
        const r = await createManualOrderAction({
          items: lines.map((l) => ({ product_id: l.productId, variant_id: l.variantId, quantity: l.quantity })),
          name: String(f.get("name")), phone: String(f.get("phone")), email: String(f.get("email") ?? ""), district: String(f.get("district")),
          upazila: String(f.get("upazila") ?? ""), address: String(f.get("address")), note: String(f.get("note") ?? ""), coupon: String(f.get("coupon") ?? ""), confirm: confirmNow,
        });
        if (!r.ok) return toast(r.error, "error");
        toast("Order created");
        router.push(`/admin/orders/${r.data!.id}`);
      });
    }}>
      <Card title="Products">
        <div className="relative">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or SKU" />
          {results.length > 0 && (
            <ul className="glass absolute inset-x-0 top-12 z-20 max-h-80 overflow-y-auto rounded-[16px] p-1.5 shadow-float">
              {results.map((p) => (
                <li key={`${p.productId}${p.variantId}`}>
                  <button type="button" onClick={() => addLine(p)} className="flex w-full items-center gap-3 rounded-[12px] p-2 text-left text-[14px] hover:bg-fill">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {p.image ? <img src={p.image} alt="" className="h-10 w-10 rounded-[10px] object-cover" /> : <span className="h-10 w-10 rounded-[10px] bg-fill" />}
                    <span className="flex-1"><span className="line-clamp-1">{p.title}</span>{p.variant && <span className="text-[12px] text-fg-muted">{p.variant}</span>}</span>
                    <span className="text-right"><span className="block font-medium">{formatBDT(p.price)}</span><span className="text-[12px] text-fg-muted">{p.stock} in stock</span></span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <ul className="mt-3">
          {lines.map((l, i) => (
            <li key={`${l.productId}${l.variantId}`} className="flex items-center gap-3 border-b border-line py-2.5 text-[14px] last:border-0">
              <span className="flex-1">{l.title}{l.variant && <span className="text-fg-muted"> · {l.variant}</span>}</span>
              <Input type="number" min={1} max={99} value={l.quantity} aria-label="Quantity" className="h-9 w-20"
                onChange={(e) => setLines((ls) => ls.map((x, j) => (j === i ? { ...x, quantity: Math.max(1, Number(e.target.value)) } : x)))} />
              <span className="w-24 text-right font-medium">{formatBDT(l.price * l.quantity)}</span>
              <button type="button" aria-label="Remove" onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4 text-fg-subtle" /></button>
            </li>
          ))}
        </ul>
        {lines.length > 0 && <p className="mt-3 text-right text-[14px]">Subtotal <span className="font-semibold">{formatBDT(subtotal)}</span> (delivery and coupons are added when you save)</p>}
      </Card>
      <Card title="Customer and delivery">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name" htmlFor="mo-name"><Input id="mo-name" name="name" required /></Field>
          <Field label="Mobile" htmlFor="mo-phone"><Input id="mo-phone" name="phone" type="tel" required /></Field>
          <Field label="Email (optional)" htmlFor="mo-email"><Input id="mo-email" name="email" type="email" /></Field>
          <Field label="District" htmlFor="mo-district">
            <Select id="mo-district" name="district" required defaultValue="">
              <option value="" disabled>Choose district</option>
              {BD_DIVISIONS.map((d) => <optgroup key={d.name} label={d.name}>{d.districts.map((x) => <option key={x.name}>{x.name}</option>)}</optgroup>)}
            </Select>
          </Field>
          <Field label="Area / Thana" htmlFor="mo-up"><Input id="mo-up" name="upazila" /></Field>
          <Field label="Coupon (optional)" htmlFor="mo-coupon"><Input id="mo-coupon" name="coupon" /></Field>
          <Field label="Address" htmlFor="mo-addr" className="sm:col-span-2"><Textarea id="mo-addr" name="address" required className="min-h-16" /></Field>
          <Field label="Note" htmlFor="mo-note" className="sm:col-span-2"><Input id="mo-note" name="note" /></Field>
          <div className="sm:col-span-2"><Switch checked={confirmNow} onChange={setConfirmNow} label="Mark as confirmed right away" /></div>
        </div>
      </Card>
      <Button type="submit" size="lg" disabled={pending || !lines.length}>Create order</Button>
    </form>
  );
}
